import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple HTML email template
const createVerificationEmailHtml = (userName: string, confirmationUrl: string, userEmail: string) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Подтвердите ваш email</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
        <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <div style="background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1e293b; font-size: 24px; font-weight: 600; margin: 0;">AIPetri Studio</h1>
            </div>
            
            <h2 style="color: #334155; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
              Добро пожаловать, ${userName}!
            </h2>
            
            <p style="color: #64748b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
              Спасибо за регистрацию в AIPetri Studio. Чтобы завершить создание аккаунта, пожалуйста, подтвердите ваш email адрес.
            </p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${confirmationUrl}" 
                 style="display: inline-block; background-color: #3b82f6; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
                Подтвердить email
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
              Если вы не регистрировались на нашем сайте, можете проигнорировать это письмо.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
            
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              © ${new Date().getFullYear()} AIPetri Studio. Все права защищены.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting verification email send process");
    
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    
    // Пытаемся сначала обработать как webhook, если есть secret и данные похожи на webhook
    if (hookSecret && payload.includes('user') && payload.includes('email_data')) {
      try {
        const wh = new Webhook(hookSecret);
        const {
          user,
          email_data: { token, token_hash, redirect_to, email_action_type },
        } = wh.verify(payload, headers) as {
          user: {
            email: string;
            user_metadata?: {
              full_name?: string;
            };
          };
          email_data: {
            token: string;
            token_hash: string;
            redirect_to: string;
            email_action_type: string;
            site_url: string;
          };
        };

        console.log("Webhook verified successfully for user:", user.email);

        const userName = user.user_metadata?.full_name || user.email.split('@')[0];
        const confirmationUrl = `${Deno.env.get('SUPABASE_URL')}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

        // Generate HTML email
        const html = createVerificationEmailHtml(userName, confirmationUrl, user.email);

        console.log("Email template generated successfully");

        const emailResponse = await resend.emails.send({
          from: "AIPetri Studio <noreply@resend.dev>",
          to: [user.email],
          subject: "Подтвердите ваш email - AIPetri Studio",
          html,
        });

        console.log("Email sent successfully:", emailResponse);

        return new Response(JSON.stringify(emailResponse), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        });
      } catch (webhookError) {
        console.log("Not a valid webhook, trying direct call...", webhookError);
      }
    }
    
    // Fallback: обрабатываем как прямой вызов
    let requestData;
    try {
      requestData = JSON.parse(payload);
    } catch (parseError) {
      console.error("Failed to parse payload as JSON:", parseError);
      throw new Error("Invalid request format");
    }
    
    const { userEmail, userName, confirmationUrl } = requestData;
    
    if (!userEmail) {
      throw new Error("userEmail is required");
    }
    
    console.log("Processing direct email request for:", userEmail);

    const html = createVerificationEmailHtml(
      userName || userEmail.split('@')[0],
      confirmationUrl || `${req.headers.get('origin')}/verify-email`,
      userEmail
    );

    const emailResponse = await resend.emails.send({
      from: "AIPetri Studio <noreply@resend.dev>",
      to: [userEmail],
      subject: "Подтвердите ваш email - AIPetri Studio",
      html,
    });

    console.log("Direct email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);