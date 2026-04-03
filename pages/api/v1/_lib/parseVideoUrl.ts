import { VideoConfig, VideoService } from '~/lib/types'
import { VideoConfigSchema } from '~/utils/schemas/video'

export interface ParsedVideoUrl {
  videoId: string
  service: VideoService
}

export function parseVideoUrl(videoUrl: string): ParsedVideoUrl | null {
  const trimmed = videoUrl.trim()

  // Bilibili: https://www.bilibili.com/video/BVxxx or https://bilibili.com/video/BVxxx
  const bilibiliMatch = trimmed.match(/bilibili\.com\/video\/([A-Za-z0-9]+)/)
  if (bilibiliMatch) {
    return { videoId: bilibiliMatch[1], service: VideoService.Bilibili }
  }

  // Bilibili short URL: https://b23.tv/BVxxx
  const b23Match = trimmed.match(/b23\.tv\/([A-Za-z0-9]+)/)
  if (b23Match) {
    return { videoId: b23Match[1], service: VideoService.Bilibili }
  }

  // YouTube: https://www.youtube.com/watch?v=xxx or https://youtu.be/xxx
  const youtubeMatch = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)
  if (youtubeMatch) {
    return { videoId: youtubeMatch[1], service: VideoService.Youtube }
  }

  return null
}

export function buildVideoConfigFromQuery(
  parsed: ParsedVideoUrl,
  query: Record<string, any>,
): VideoConfig {
  const schema: VideoConfigSchema = {}

  if (query.outputLanguage !== undefined) schema.outputLanguage = query.outputLanguage
  if (query.showEmoji !== undefined) schema.showEmoji = query.showEmoji === 'true' || query.showEmoji === true
  if (query.showTimestamp !== undefined)
    schema.showTimestamp = query.showTimestamp === 'true' || query.showTimestamp === true
  if (query.detailLevel !== undefined) schema.detailLevel = Number(query.detailLevel)
  if (query.sentenceNumber !== undefined) schema.sentenceNumber = Number(query.sentenceNumber)
  if (query.outlineLevel !== undefined) schema.outlineLevel = Number(query.outlineLevel)
  if (query.model !== undefined) schema.model = query.model
  if (query.enableStream !== undefined) schema.enableStream = query.enableStream === 'true' || query.enableStream === true

  return {
    videoId: parsed.videoId,
    service: parsed.service,
    pageNumber: query.pageNumber || null,
    ...schema,
  }
}
