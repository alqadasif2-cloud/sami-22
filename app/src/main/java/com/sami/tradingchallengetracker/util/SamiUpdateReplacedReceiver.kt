package com.sami.tradingchallengetracker.util

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Triggered automatically by Android after Sami is upgraded in-place over the previous version.
 * Cleans up temporary APK update files in private storage while preserving all user sessions,
 * Room database records, and local preferences.
 */
class SamiUpdateReplacedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            try {
                SamiUpdateManager.cleanupAfterPackageUpgrade(context.applicationContext)
                Log.i("SamiUpdater", "Package upgraded successfully in-place; cleaned temporary APK update files.")
            } catch (e: Exception) {
                Log.w("SamiUpdater", "Cleanup notice after MY_PACKAGE_REPLACED: ${e.message}")
            }
        }
    }
}
