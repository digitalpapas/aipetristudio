import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const diagnostics = {
    keyPresent: false,
    assistantFound: false,
    threadCreated: false,
    messageAdded: false,
    runStarted: false,
    runCompleted: false,
    responseReceived: false,
    error: null
  }

  try {
    // Проверка ключа
    const openaiApiKey = Deno.env.get('OPEN_AI_API')
    diagnostics.keyPresent = !!openaiApiKey
    
    if (!openaiApiKey) {
      throw new Error('OPEN_AI_API key not found')
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    })

    // Проверка ассистента
    const ASSISTANT_ID = 'asst_be5fwjyKdRW6s2eKazlf2lna'
    try {
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID)
      diagnostics.assistantFound = !!assistant
      console.log('Assistant found:', assistant.name)
    } catch (e) {
      throw new Error('Assistant not found: ' + e.message)
    }

    // Создание thread
    const thread = await openai.beta.threads.create()
    diagnostics.threadCreated = !!thread.id
    console.log('Thread created:', thread.id)

    // Добавление сообщения
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: 'Тестовое сообщение: дай краткий ответ что ты работаешь'
    })
    diagnostics.messageAdded = true

    // Запуск
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID,
    })
    diagnostics.runStarted = !!run.id
    console.log('Run started:', run.id)

    // Ожидание
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
    let attempts = 0
    
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 1000))
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id)
      attempts++
      console.log(`Status: ${runStatus.status}, attempt: ${attempts}`)
      
      if (attempts > 30) break
    }

    diagnostics.runCompleted = runStatus.status === 'completed'
    
    if (runStatus.status !== 'completed') {
      throw new Error(`Run ended with status: ${runStatus.status}, last_error: ${JSON.stringify(runStatus.last_error)}`)
    }

    // Получение ответа
    const messages = await openai.beta.threads.messages.list(thread.id)
    const lastMessage = messages.data[0]
    diagnostics.responseReceived = !!lastMessage

    return new Response(
      JSON.stringify({ 
        success: true,
        diagnostics,
        response: lastMessage?.content[0]?.text?.value || 'No response'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    diagnostics.error = error.message
    
    return new Response(
      JSON.stringify({ 
        success: false,
        diagnostics,
        error: error.message
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})