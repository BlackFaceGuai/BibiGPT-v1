import type { NextApiRequest, NextApiResponse } from 'next'
import { fetchSubtitle } from '~/lib/fetchSubtitle'
import { successResponse, errorResponse } from './_lib/response'
import { parseVideoUrl, buildVideoConfigFromQuery } from './_lib/parseVideoUrl'
import { CommonSubtitleItem } from '~/lib/types'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json(errorResponse('Method Not Allowed'))
  }

  const { url } = req.query as Record<string, string>

  if (!url) {
    return res.status(400).json(errorResponse('Missing required parameter: url'))
  }

  const parsed = parseVideoUrl(url)
  if (!parsed) {
    return res.status(400).json(errorResponse('Invalid video URL. Supported: Bilibili, YouTube'))
  }

  const videoConfig = buildVideoConfigFromQuery(parsed, req.query)
  const shouldShowTimestamp = req.query.showTimestamp === 'true'

  try {
    const { title, subtitlesArray, descriptionText } = await fetchSubtitle(videoConfig, shouldShowTimestamp)

    if (!subtitlesArray && !descriptionText) {
      return res.status(404).json(errorResponse('No subtitle or description found for this video'))
    }

    const subtitles = subtitlesArray
      ? subtitlesArray.map((item: CommonSubtitleItem) => ({
          from: item.s ? Number(item.s) : 0,
          text: item.text,
          index: item.index,
        }))
      : undefined

    return res.status(200).json(
      successResponse({
        title,
        subtitles,
        description: descriptionText,
      }),
    )
  } catch (error: any) {
    console.error(error?.message)
    return res.status(500).json(errorResponse(error?.message || 'Failed to fetch subtitle'))
  }
}
