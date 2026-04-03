import type { NextApiRequest, NextApiResponse } from 'next'
import { buildSummarizeOpenAIPayload, SummarizeRequestError } from '~/lib/openai/buildSummarizeRequest'
import { fetchOpenAIResult } from '~/lib/openai/fetchOpenAIResult'
import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { SummarizeParams } from '~/lib/types'
import { writeWebStreamToNodeResponse } from '~/lib/openai/writeWebStreamToNodeResponse'
import { successResponse, errorResponse } from './_lib/response'
import { parseVideoUrl, buildVideoConfigFromQuery } from './_lib/parseVideoUrl'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json(errorResponse('Method Not Allowed'))
  }

  const { url, ...query } = req.query as Record<string, string>

  if (!url) {
    return res.status(400).json(errorResponse('Missing required parameter: url'))
  }

  const parsed = parseVideoUrl(url)
  if (!parsed) {
    return res.status(400).json(errorResponse('Invalid video URL. Supported: Bilibili, YouTube'))
  }

  const videoConfig = buildVideoConfigFromQuery(parsed, query)
  const userConfig = {
    userKey: query.userKey,
    baseUrl: query.baseUrl,
    shouldShowTimestamp: query.showTimestamp === 'true' || query.showTimestamp === true,
  }

  try {
    const { openAiPayload, userKey, baseUrl, videoId } = await buildSummarizeOpenAIPayload({
      videoConfig,
      userConfig,
    } as SummarizeParams)

    const openaiApiKey = await selectApiKeyAndActivatedLicenseKey(userKey, videoId)
    const result = await fetchOpenAIResult(openAiPayload, openaiApiKey, videoConfig, baseUrl)

    if (openAiPayload.stream) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-cache')
      if (result instanceof ReadableStream) {
        await writeWebStreamToNodeResponse(result, res)
        return
      }
      res.status(200).send(result)
      return
    }

    return res.status(200).json(successResponse({ videoId, summary: result }))
  } catch (error: any) {
    if (error instanceof SummarizeRequestError) {
      return res.status(error.statusCode).json(errorResponse(error.message))
    }
    console.error(error?.message)
    return res.status(500).json(errorResponse(error?.message || 'Internal Server Error'))
  }
}
