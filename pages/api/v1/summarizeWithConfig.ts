import type { NextApiRequest, NextApiResponse } from 'next'
import { buildSummarizeOpenAIPayload, SummarizeRequestError } from '~/lib/openai/buildSummarizeRequest'
import { fetchOpenAIResult } from '~/lib/openai/fetchOpenAIResult'
import { selectApiKeyAndActivatedLicenseKey } from '~/lib/openai/selectApiKeyAndActivatedLicenseKey'
import { SummarizeParams } from '~/lib/types'
import { writeWebStreamToNodeResponse } from '~/lib/openai/writeWebStreamToNodeResponse'
import { successResponse, errorResponse } from './_lib/response'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json(errorResponse('Method Not Allowed'))
  }

  const body = req.body as Partial<SummarizeParams>

  if (!body?.videoConfig || !body?.userConfig) {
    return res.status(400).json(errorResponse('Missing videoConfig or userConfig'))
  }

  try {
    const normalizedParams = body as SummarizeParams
    const { videoConfig } = normalizedParams
    const { openAiPayload, userKey, baseUrl, videoId } = await buildSummarizeOpenAIPayload(normalizedParams)
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
