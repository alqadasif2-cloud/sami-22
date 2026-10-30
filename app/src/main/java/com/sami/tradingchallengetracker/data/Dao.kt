package com.sami.tradingchallengetracker.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ChallengeDao {
    @Query("SELECT * FROM challenges WHERE userId = :userId ORDER BY createdAt DESC LIMIT 1")
    fun getActiveChallengeFlow(userId: Int): Flow<ChallengeEntity?>

    @Query("SELECT * FROM challenges WHERE userId = :userId ORDER BY createdAt DESC LIMIT 1")
    suspend fun getActiveChallenge(userId: Int): ChallengeEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(challenge: ChallengeEntity)

    @Query("UPDATE challenges SET currentBalanceCents = :newBalance, tradeCount = :newCount, updatedAt = :updatedAt WHERE id = :id")
    suspend fun updateBalanceAndCount(id: String, newBalance: Long, newCount: Int, updatedAt: Long)
}

@Dao
interface TradeDao {
    @Query("SELECT * FROM trades WHERE challengeId = :challengeId ORDER BY tradeNumber DESC")
    fun getTradesFlow(challengeId: String): Flow<List<TradeEntity>>

    @Query("SELECT * FROM trades WHERE challengeId = :challengeId ORDER BY tradeNumber ASC")
    suspend fun getTradesAsc(challengeId: String): List<TradeEntity>

    @Query("SELECT * FROM trades WHERE challengeId = :challengeId ORDER BY tradeNumber DESC")
    suspend fun getTradesDesc(challengeId: String): List<TradeEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(trade: TradeEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(trades: List<TradeEntity>)

    @Query("DELETE FROM trades WHERE challengeId = :challengeId")
    suspend fun deleteForChallenge(challengeId: String)
}

@Dao
interface MilestoneDao {
    @Query("SELECT * FROM milestones WHERE challengeId = :challengeId ORDER BY milestoneNumber ASC")
    fun getMilestonesFlow(challengeId: String): Flow<List<MilestoneEntity>>

    @Query("SELECT * FROM milestones WHERE challengeId = :challengeId ORDER BY milestoneNumber ASC")
    suspend fun getMilestones(challengeId: String): List<MilestoneEntity>

    @Query("SELECT * FROM milestones WHERE challengeId = :challengeId AND milestoneNumber = :number LIMIT 1")
    suspend fun getMilestoneByNumber(challengeId: String, number: Int): MilestoneEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(milestones: List<MilestoneEntity>)

    @Update
    suspend fun update(milestone: MilestoneEntity)

    @Query("DELETE FROM milestones WHERE challengeId = :challengeId")
    suspend fun deleteForChallenge(challengeId: String)
}
