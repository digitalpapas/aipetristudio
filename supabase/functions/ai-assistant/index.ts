import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { systemPrompt, userMessage, threadId } = await req.json()
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OPEN_AI_API')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const ASSISTANT_ID = 'asst_be5fwjyKdRW6s2eKazlf2lna'
    
    // Используем прямой fetch вместо SDK
    const baseURL = 'https://api.openai.com/v1'
    const headers = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
      'OpenAI-Beta': 'assistants=v2'
    }

    // Создаем или используем thread
    let currentThreadId = threadId
    
    if (!currentThreadId) {
      const threadResponse = await fetch(`${baseURL}/threads`, {
        method: 'POST',
        headers,
        body: JSON.stringify({})
      })
      
      if (!threadResponse.ok) {
        const error = await threadResponse.text()
        throw new Error(`Failed to create thread: ${error}`)
      }
      
      const threadData = await threadResponse.json()
      currentThreadId = threadData.id
    }

    // Добавляем сообщение
    const messageContent = systemPrompt 
      ? `КОНТЕКСТ:\n${systemPrompt}\n\nВОПРОС:\n${userMessage}`
      : userMessage

    const messageResponse = await fetch(`${baseURL}/threads/${currentThreadId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        role: 'user',
        content: messageContent
      })
    })

    if (!messageResponse.ok) {
      const error = await messageResponse.text()
      throw new Error(`Failed to add message: ${error}`)
    }

    // Запускаем assistant
    const runResponse = await fetch(`${baseURL}/threads/${currentThreadId}/runs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        assistant_id: ASSISTANT_ID
      })
    })

    if (!runResponse.ok) {
      const error = await runResponse.text()
      throw new Error(`Failed to start run: ${error}`)
    }

    const runData = await runResponse.json()
    const runId = runData.id

    // Ждем завершения
    let attempts = 0
    let runStatus = 'in_progress'
    
    while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const statusResponse = await fetch(`${baseURL}/threads/${currentThreadId}/runs/${runId}`, {
        method: 'GET',
        headers
      })
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        runStatus = statusData.status
      }
      
      attempts++
    }

    if (runStatus !== 'completed') {
      throw new Error(`Run failed with status: ${runStatus}`)
    }

    // Получаем сообщения
    const messagesResponse = await fetch(`${baseURL}/threads/${currentThreadId}/messages`, {
      method: 'GET',
      headers
    })

    if (!messagesResponse.ok) {
      throw new Error('Failed to get messages')
    }

    const messagesData = await messagesResponse.json()
    const assistantMessage = messagesData.data.find((msg: any) => msg.role === 'assistant')
    
    if (!assistantMessage) {
      throw new Error('No assistant response found')
    }

    const response = assistantMessage.content[0].text.value

    return new Response(
      JSON.stringify({ 
        response,
        threadId: currentThreadId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        response: `Ошибка: ${errorMessage}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})