import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "publish" 
  | "unpublish"
  | "login"
  | "logout"
  | "settings_change";

export type EntityType = 
  | "financial_tip"
  | "event"
  | "learning_content"
  | "credit_product"
  | "user"
  | "donation_link"
  | "settings"
  | "bug_report";

interface LogAuditParams {
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  details?: Json;
}

export async function logAuditEvent({ 
  action, 
  entityType, 
  entityId, 
  details 
}: LogAuditParams): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("audit_logs").insert([{
      user_id: user?.id || null,
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
      user_agent: navigator.userAgent,
    }]);

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  } catch (err) {
    console.error("Audit logging error:", err);
  }
}

// Helper functions for common actions
export const auditLog = {
  create: (entityType: EntityType, entityId?: string, details?: Json) =>
    logAuditEvent({ action: "create", entityType, entityId, details }),
  
  update: (entityType: EntityType, entityId?: string, details?: Json) =>
    logAuditEvent({ action: "update", entityType, entityId, details }),
  
  delete: (entityType: EntityType, entityId?: string, details?: Json) =>
    logAuditEvent({ action: "delete", entityType, entityId, details }),
  
  publish: (entityType: EntityType, entityId?: string, details?: Json) =>
    logAuditEvent({ action: "publish", entityType, entityId, details }),
  
  unpublish: (entityType: EntityType, entityId?: string, details?: Json) =>
    logAuditEvent({ action: "unpublish", entityType, entityId, details }),
};
