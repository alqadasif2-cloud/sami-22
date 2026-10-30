package com.sami.tradingchallengetracker.data

import androidx.room.withTransaction
import kotlinx.coroutines.flow.Flow
import java.util.UUID

class TradingRepository(private val db: AppDatabase) {

    private val challengeDao = db.challengeDao()
    private val tradeDao = db.tradeDao()
    private val milestoneDao = db.milestoneDao()

    fun getActiveChallengeFlow(userId: Int): Flow<ChallengeEntity?> =
        challengeDao.getActiveChallengeFlow(userId)

    fun getTradesFlow(challengeId: String): Flow<List<TradeEntity>> =
        tradeDao.getTradesFlow(challengeId)

    fun getMilestonesFlow(challengeId: String): Flow<List<MilestoneEntity>> =
        milestoneDao.getMilestonesFlow(challengeId)

    suspend fun ensureActiveChallenge(userId: Int, defaultUserName: String = ""): ChallengeEntity {
        val existing = challengeDao.getActiveChallenge(userId)
        if (existing == null) {
            val newId = "challenge_u${userId}_${System.currentTimeMillis()}"
            val newChallenge = ChallengeEntity(
                id = newId,
                userId = userId,
                userName = defaultUserName,
                initialCapitalCents = 10000L,
                currentBalanceCents = 10000L,
                targetBalanceCents = 300000L,
                tradeCount = 0,
                challengeStarted = false
            )
            db.withTransaction {
                challengeDao.insertOrUpdate(newChallenge)
                initMilestonesForChallenge(newId)
            }
            return newChallenge
        }

        if (existing.userName.isBlank() && defaultUserName.isNotBlank()) {
            val updated = existing.copy(userName = defaultUserName)
            challengeDao.insertOrUpdate(updated)
            return updated
        }

        return existing
    }

    private suspend fun initMilestonesForChallenge(challengeId: String) {
        val list = mutableListOf<MilestoneEntity>()
        for (i in 1..150) {
            list.add(
                MilestoneEntity(
                    id = "${challengeId}_milestone_$i",
                    challengeId = challengeId,
                    milestoneNumber = i,
                    profitCents = null,
                    balanceCents = null,
                    status = MilestoneStatus.PENDING,
                    tradeId = null,
                    timestamp = null,
                    attachmentPath = null
                )
            )
        }
        milestoneDao.insertAll(list)
    }

    suspend fun saveSettings(
        userId: Int,
        userName: String,
        initialCapitalCents: Long,
        targetBalanceCents: Long
    ) {
        val current = ensureActiveChallenge(userId, userName)
        val updated = current.copy(
            userName = userName.trim(),
            targetBalanceCents = targetBalanceCents,
            initialCapitalCents = if (!current.challengeStarted) initialCapitalCents else current.initialCapitalCents,
            currentBalanceCents = if (!current.challengeStarted) initialCapitalCents else current.currentBalanceCents,
            updatedAt = System.currentTimeMillis()
        )
        challengeDao.insertOrUpdate(updated)
    }

    suspend fun startChallenge(userId: Int): ChallengeEntity {
        val current = ensureActiveChallenge(userId)
        val started = current.copy(
            challengeStarted = true,
            currentBalanceCents = current.initialCapitalCents,
            tradeCount = 0,
            updatedAt = System.currentTimeMillis()
        )
        db.withTransaction {
            tradeDao.deleteForChallenge(current.id)
            milestoneDao.deleteForChallenge(current.id)
            initMilestonesForChallenge(current.id)
            challengeDao.insertOrUpdate(started)
        }
        return started
    }

    suspend fun recordTrade(
        userId: Int,
        resultCents: Long,
        attachmentUrl: String?
    ): TradeEntity = db.withTransaction {
        val challenge = challengeDao.getActiveChallenge(userId)
            ?: throw IllegalStateException("يجب بدء الرحلة أولاً.")

        if (!challenge.challengeStarted) {
            throw IllegalStateException("يجب بدء الرحلة أولاً.")
        }
        val completedWins = tradeDao.getTradesAsc(challenge.id).count { it.type == TradeType.WIN }
        if (completedWins >= 150) {
            throw IllegalStateException("تم إكمال جميع محطات الرحلة الـ150.")
        }
        if (resultCents == 0L) {
            throw IllegalArgumentException("لا يمكن أن تكون نتيجة الصفقة صفراً.")
        }

        val oldBalance = challenge.currentBalanceCents
        val newBalance = oldBalance + resultCents
        val tradeNumber = challenge.tradeCount + 1
        val type = if (resultCents > 0) TradeType.WIN else TradeType.LOSS
        val now = System.currentTimeMillis()
        val tradeId = UUID.randomUUID().toString()

        val trade = TradeEntity(
            id = tradeId,
            challengeId = challenge.id,
            tradeNumber = tradeNumber,
            resultCents = resultCents,
            oldBalanceCents = oldBalance,
            newBalanceCents = newBalance,
            type = type,
            attachmentPath = attachmentUrl,
            timestamp = now
        )

        val milestone = MilestoneEntity(
            id = "${challenge.id}_milestone_$tradeNumber",
            challengeId = challenge.id,
            milestoneNumber = tradeNumber,
            profitCents = resultCents,
            balanceCents = newBalance,
            status = if (type == TradeType.WIN) MilestoneStatus.WIN else MilestoneStatus.LOSS,
            tradeId = tradeId,
            timestamp = now,
            attachmentPath = attachmentUrl
        )

        tradeDao.insert(trade)
        milestoneDao.insertAll(listOf(milestone))

        if (type == TradeType.LOSS) {
            val currentMilestones = milestoneDao.getMilestones(challenge.id)
            val nextMilestoneNumber = (currentMilestones.maxOfOrNull { it.milestoneNumber } ?: 150) + 1
            val extraMilestone = MilestoneEntity(
                id = "${challenge.id}_milestone_$nextMilestoneNumber",
                challengeId = challenge.id,
                milestoneNumber = nextMilestoneNumber,
                profitCents = null,
                balanceCents = null,
                status = MilestoneStatus.PENDING,
                tradeId = null,
                timestamp = null,
                attachmentPath = null
            )
            milestoneDao.insertAll(listOf(extraMilestone))
        }

        challengeDao.updateBalanceAndCount(challenge.id, newBalance, tradeNumber, now)

        trade
    }

    suspend fun resetChallenge(userId: Int) = db.withTransaction {
        val current = ensureActiveChallenge(userId)
        tradeDao.deleteForChallenge(current.id)
        milestoneDao.deleteForChallenge(current.id)
        initMilestonesForChallenge(current.id)

        val reset = current.copy(
            currentBalanceCents = current.initialCapitalCents,
            tradeCount = 0,
            updatedAt = System.currentTimeMillis()
        )
        challengeDao.insertOrUpdate(reset)
    }

    suspend fun startNewChallenge(userId: Int, newInitialCapitalCents: Long) = db.withTransaction {
        val current = ensureActiveChallenge(userId)
        val newId = "challenge_u${userId}_${System.currentTimeMillis()}"
        val newChallenge = ChallengeEntity(
            id = newId,
            userId = userId,
            userName = current.userName,
            initialCapitalCents = newInitialCapitalCents,
            currentBalanceCents = newInitialCapitalCents,
            targetBalanceCents = current.targetBalanceCents,
            tradeCount = 0,
            challengeStarted = true,
            createdAt = System.currentTimeMillis(),
            updatedAt = System.currentTimeMillis()
        )
        challengeDao.insertOrUpdate(newChallenge)
        initMilestonesForChallenge(newId)
    }

    suspend fun getTradesForPdf(challengeId: String): List<TradeEntity> =
        tradeDao.getTradesAsc(challengeId)

    suspend fun restoreFromCloud(
        userId: Int,
        cloudChallenge: ChallengeEntity,
        cloudTrades: List<TradeEntity>
    ) = db.withTransaction {
        val local = challengeDao.getActiveChallenge(userId)
        if (local == null || cloudChallenge.updatedAt >= local.updatedAt || cloudTrades.isNotEmpty()) {
            challengeDao.insertOrUpdate(cloudChallenge)
            tradeDao.deleteForChallenge(cloudChallenge.id)
            if (cloudTrades.isNotEmpty()) {
                tradeDao.insertAll(cloudTrades)
            }
            milestoneDao.deleteForChallenge(cloudChallenge.id)
            val lossCount = cloudTrades.count { it.type == TradeType.LOSS }
            val totalMilestones = 150 + lossCount
            val rebuiltMilestones = (1..totalMilestones).map { num ->
                val t = cloudTrades.find { it.tradeNumber == num }
                MilestoneEntity(
                    id = "${cloudChallenge.id}_milestone_$num",
                    challengeId = cloudChallenge.id,
                    milestoneNumber = num,
                    profitCents = t?.resultCents,
                    balanceCents = t?.newBalanceCents,
                    status = when (t?.type) {
                        TradeType.WIN -> MilestoneStatus.WIN
                        TradeType.LOSS -> MilestoneStatus.LOSS
                        null -> MilestoneStatus.PENDING
                    },
                    tradeId = t?.id,
                    timestamp = t?.timestamp,
                    attachmentPath = t?.attachmentPath
                )
            }
            milestoneDao.insertAll(rebuiltMilestones)
        }
    }
}
