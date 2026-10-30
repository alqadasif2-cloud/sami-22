package com.sami.tradingchallengetracker.util

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BrokenImage
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import coil.compose.SubcomposeAsyncImage
import coil.request.CachePolicy
import coil.request.ImageRequest
import com.sami.tradingchallengetracker.ui.AmberAccent

@Composable
fun CloudAsyncImage(
    imageUrl: String?,
    contentDescription: String? = null,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop
) {
    val context = LocalContext.current

    if (imageUrl.isNullOrBlank()) {
        Box(
            modifier = modifier.background(Color(0xFF0F172A)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = Icons.Default.BrokenImage,
                contentDescription = contentDescription,
                tint = Color(0xFF475569),
                modifier = Modifier.size(24.dp)
            )
        }
        return
    }

    val request = ImageRequest.Builder(context)
        .data(imageUrl)
        .crossfade(true)
        .diskCachePolicy(CachePolicy.ENABLED)
        .memoryCachePolicy(CachePolicy.ENABLED)
        .networkCachePolicy(CachePolicy.ENABLED)
        .build()

    SubcomposeAsyncImage(
        model = request,
        contentDescription = contentDescription,
        modifier = modifier,
        contentScale = contentScale,
        loading = {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(Color(0xFF0A0F1A)),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(
                    color = AmberAccent,
                    strokeWidth = 2.dp,
                    modifier = Modifier.size(24.dp)
                )
            }
        },
        error = {
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(Color(0xFF0F172A)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = Icons.Default.BrokenImage,
                    contentDescription = contentDescription,
                    tint = Color(0xFF64748B),
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    )
}
