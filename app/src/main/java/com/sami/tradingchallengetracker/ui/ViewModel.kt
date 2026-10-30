package com.sami.tradingchallengetracker.ui

import android.app.Application
import android.content.Context
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.sami.tradingchallengetracker.data.AppDatabase
import com.sami.tradingchallengetracker.data.ChallengeEntity
import com.sami.tradingchallengetracker.data.MilestoneEntity
import com.sami.tradingchallengetracker.data.TradeEntity
import com.sami.tradingchallengetracker.data.TradingRepository
import com.sami.tradingchallengetracker.util.FirebaseCloudHelper
import com.sami.tradingchallengetracker.util.PdfExporter
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalCoroutinesApi::class)
class MainViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = TradingRepository(AppDatabase.getDatabase(application))
    private val activeUserIdFlow = MutableStateFlow<Int?>(null)

    val challenge: StateFlow<ChallengeEntity?> = activeUserIdFlow.flatMapLatest { uid ->
        if (uid == null || uid <= 0) flowOf(null)
        else repository.getActiveChallengeFlow(uid)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), null)

    val trades: StateFlow<List<TradeEntity>> = challenge.flatMapLatest { ch ->
        if (ch == null) flowOf(emptyList())
        else repository.getTradesFlow(ch.id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val milestones: StateFlow<List<MilestoneEntity>> = challenge.flatMapLatest { ch ->
        if (ch == null) flowOf(emptyList())
        else repository.getMilestonesFlow(ch.id)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    fun setCurrentUser(userId: Int, displayName: String) {
        activeUserIdFlow.value = userId
        viewModelScope.launch {
            val cloudData = FirebaseCloudHelper.fetchUserChallengeFromFirestore(getApplication(), userId)
            if (cloudData != null) {
                repository.restoreFromCloud(userId, cloudData.first, cloudData.second)
            } else {
                repository.ensureActiveChallenge(userId, displayName)
                syncToCloud(uid = userId)
            }
        }
    }

    fun clearSession() {
        activeUserIdFlow.value = null
    }

    private suspend fun syncToCloud(uid: Int) {
        val ch = repository.ensureActiveChallenge(uid)
        val allTrades = repository.getTradesForPdf(ch.id)
        FirebaseCloudHelper.syncUserChallengeToFirestore(getApplication(), uid, ch, allTrades)
    }

    fun saveSettings(userName: String, initialCapitalCents: Long, targetBalanceCents: Long) {
        val uid = activeUserIdFlow.value ?: return
        viewModelScope.launch {
            repository.saveSettings(uid, userName, initialCapitalCents, targetBalanceCents)
            syncToCloud(uid)
        }
    }

    fun startChallenge() {
        val uid = activeUserIdFlow.value ?: return
        viewModelScope.launch {
            val current = repository.ensureActiveChallenge(uid)
            val oldTrades = repository.getTradesForPdf(current.id)
            FirebaseCloudHelper.deleteMultipleCloudImages(getApplication(), oldTrades.map { it.attachmentPath })
            repository.startChallenge(uid)
            syncToCloud(uid)
        }
    }

    fun recordTrade(
        resultCents: Long,
        attachmentUri: Uri?,
        onSuccess: (Int) -> Unit,
        onError: (String) -> Unit
    ) {
        val uid = activeUserIdFlow.value ?: return
        viewModelScope.launch {
            try {
                var cloudUrl: String? = null
                if (attachmentUri != null) {
                    val uploaded = FirebaseCloudHelper.uploadImageToCloud(
                        getApplication(),
                        attachmentUri,
                        "trade_images",
                        uid
                    )
                    cloudUrl = uploaded.first
                }
                val saved = repository.recordTrade(uid, resultCents, cloudUrl)
                syncToCloud(uid)
                onSuccess(saved.tradeNumber)
            } catch (e: Exception) {
                onError(e.message ?: "حدث خطأ أثناء حفظ الصفقة")
            }
        }
    }

    fun resetChallenge(onDone: () -> Unit) {
        val uid = activeUserIdFlow.value ?: return
        viewModelScope.launch {
            val current = repository.ensureActiveChallenge(uid)
            val oldTrades = repository.getTradesForPdf(current.id)
            FirebaseCloudHelper.deleteMultipleCloudImages(getApplication(), oldTrades.map { it.attachmentPath })
            repository.resetChallenge(uid)
            syncToCloud(uid)
            onDone()
        }
    }

    fun startNewChallenge(newCapitalCents: Long, onDone: () -> Unit) {
        val uid = activeUserIdFlow.value ?: return
        viewModelScope.launch {
            val current = repository.ensureActiveChallenge(uid)
            val oldTrades = repository.getTradesForPdf(current.id)
            FirebaseCloudHelper.deleteMultipleCloudImages(getApplication(), oldTrades.map { it.attachmentPath })
            repository.startNewChallenge(uid, newCapitalCents)
            syncToCloud(uid)
            onDone()
        }
    }

    fun sharePdfReport(context: Context, onError: (String) -> Unit = {}) {
        val currentChallenge = challenge.value
        if (currentChallenge == null) {
            onError("لا توجد بيانات رحلة نشطة لمشاركتها.")
            return
        }
        viewModelScope.launch {
            try {
                val allTrades = repository.getTradesForPdf(currentChallenge.id)
                PdfExporter.shareReport(context, currentChallenge, allTrades, onError)
            } catch (e: Throwable) {
                onError("تعذر إعداد تقرير PDF: ${e.localizedMessage ?: "خطأ غير متوقع"}")
            }
        }
    }
}
