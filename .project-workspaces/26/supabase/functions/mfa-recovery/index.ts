import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user's token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, recoveryCode, factorId } = await req.json();
    console.log(`MFA recovery action: ${action} for user: ${user.id}`);

    if (action === 'generate') {
      // Generate 10 recovery codes with bcrypt hashing
      console.log('Generating new recovery codes...');
      
      // Delete existing recovery codes
      const { error: deleteError } = await supabase
        .from('mfa_recovery_codes')
        .delete()
        .eq('user_id', user.id);
      
      if (deleteError) {
        console.error('Error deleting existing codes:', deleteError);
        throw deleteError;
      }

      // Generate 10 random recovery codes
      const codes: string[] = [];
      for (let i = 0; i < 10; i++) {
        const array = new Uint8Array(4);
        crypto.getRandomValues(array);
        const code = Array.from(array)
          .map(b => b.toString(16).padStart(2, '0').toUpperCase())
          .join('');
        codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
      }

      // Hash and store codes using bcrypt
      for (const code of codes) {
        const normalizedCode = code.toLowerCase().replace(/\s|-/g, '');
        // Use bcrypt with cost factor 10 for secure hashing
        const codeHash = await bcrypt.hash(normalizedCode);
        
        const { error: insertError } = await supabase
          .from('mfa_recovery_codes')
          .insert({ user_id: user.id, code_hash: codeHash });
        
        if (insertError) {
          console.error('Error inserting code:', insertError);
          throw insertError;
        }
      }

      console.log(`Successfully generated ${codes.length} recovery codes`);
      return new Response(
        JSON.stringify({ success: true, codes }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify') {
      // Verify a recovery code using bcrypt comparison
      if (!recoveryCode) {
        return new Response(
          JSON.stringify({ success: false, error: "Recovery code required" }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Verifying recovery code...');
      
      // Get all unused recovery codes for the user
      const { data: codes, error: fetchError } = await supabase
        .from('mfa_recovery_codes')
        .select('id, code_hash')
        .eq('user_id', user.id)
        .eq('is_used', false);

      if (fetchError) {
        console.error('Error fetching codes:', fetchError);
        throw fetchError;
      }

      if (!codes || codes.length === 0) {
        console.log('No valid recovery codes found');
        return new Response(
          JSON.stringify({ success: false, error: "No valid recovery codes available" }), 
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const normalizedCode = recoveryCode.toLowerCase().replace(/\s|-/g, '');
      
      // Check each code using bcrypt compare
      for (const code of codes) {
        try {
          const isMatch = await bcrypt.compare(normalizedCode, code.code_hash);
          
          if (isMatch) {
            console.log('Recovery code matched, marking as used...');
            
            // Mark the code as used
            const { error: updateError } = await supabase
              .from('mfa_recovery_codes')
              .update({ is_used: true, used_at: new Date().toISOString() })
              .eq('id', code.id);

            if (updateError) {
              console.error('Error marking code as used:', updateError);
              throw updateError;
            }

            // Unenroll MFA factor if provided
            if (factorId) {
              console.log('Unenrolling MFA factor:', factorId);
              // Use admin API to unenroll the factor
              const { error: unenrollError } = await supabase.auth.admin.mfa.deleteFactor({
                id: factorId,
                userId: user.id
              });
              
              if (unenrollError) {
                console.error('Error unenrolling MFA:', unenrollError);
                // Don't throw - recovery was still successful
              }
            }

            console.log('Recovery code verification successful');
            return new Response(
              JSON.stringify({ success: true }), 
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (bcryptError) {
          // If bcrypt compare fails (e.g., old SHA-256 hash format), try next code
          console.log('Bcrypt compare failed, trying next code...');
          continue;
        }
      }

      console.log('No matching recovery code found');
      return new Response(
        JSON.stringify({ success: false, error: "Invalid recovery code" }), 
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid action" }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: unknown) {
    console.error('MFA recovery error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
