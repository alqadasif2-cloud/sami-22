package com.sami.tradingchallengetracker.data

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.ForeignKey
import androidx.room.Index

enum class TradeType {
    WIN, LOSS
}

enum class MilestoneStatus {
    PENDING, WIN, LOSS
}

@Entity(
    tableName = "challenges",
    indices = [Index(value = ["userId"])]
)
data class ChallengeEntity(
    @PrimaryKey val id: String,
    val userId: Int = 1,
    val userName: String = "",
    val initialCapitalCents: Long = 10000L, // $100.00
    val currentBalanceCents: Long = 10000L,
    val targetBalanceCents: Long = 300000L, // $3,000.00
    val tradeCount: Int = 0,
    val challengeStarted: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "trades",
    foreignKeys = [
        ForeignKey(
            entity = ChallengeEntity::class,
            parentColumns = ["id"],
            childColumns = ["challengeId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["challengeId"]), Index(value = ["challengeId", "tradeNumber"], unique = true)]
)
data class TradeEntity(
    @PrimaryKey val id: String,
    val challengeId: String,
    val tradeNumber: Int,
    val resultCents: Long,
    val oldBalanceCents: Long,
    val newBalanceCents: Long,
    val type: TradeType,
    val attachmentPath: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

@Entity(
    tableName = "milestones",
    foreignKeys = [
        ForeignKey(
            entity = ChallengeEntity::class,
            parentColumns = ["id"],
            childColumns = ["challengeId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index(value = ["challengeId"]), Index(value = ["challengeId", "milestoneNumber"], unique = true)]
)
data class MilestoneEntity(
    @PrimaryKey val id: String,
    val challengeId: String,
    val milestoneNumber: Int,
    val profitCents: Long? = null,
    val balanceCents: Long? = null,
    val status: MilestoneStatus = MilestoneStatus.PENDING,
    val tradeId: String? = null,
    val timestamp: Long? = null,
    val attachmentPath: String? = null
)
