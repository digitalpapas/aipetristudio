import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import React from 'npm:react@18.3.1';
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
import { VerificationEmail } from './_templates/verification-email.tsx';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") as string;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

        // Render the React email template
        const html = await renderAsync(
          React.createElement(VerificationEmail, {
            userName,
            confirmationUrl,
            userEmail: user.email,
          })
        );

        console.log("Email template rendered successfully");

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

    const html = await renderAsync(
      React.createElement(VerificationEmail, {
        userName: userName || userEmail.split('@')[0],
        confirmationUrl: confirmationUrl || `${req.headers.get('origin')}/verify-email`,
        userEmail,
      })
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