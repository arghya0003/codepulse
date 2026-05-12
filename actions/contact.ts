"use server";

import { db } from "@/db";
import { contactSubmissions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";

export const contactSchema = z.object({
  name:    z.string().min(2, "Name must be at least 2 characters"),
  email:   z.string().email("Invalid email address"),
  role:    z.string().optional(),
  type:    z.enum(["feedback", "bug", "experience", "flaw"]),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000),
});

export type ContactInput = z.infer<typeof contactSchema>;

export async function submitContact(input: ContactInput): Promise<{ success: boolean; error?: string }> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const { name, email, role, type, message } = parsed.data;

  // Feedback auto-approved to show in testimonials
  const approved = type === "feedback";

  try {
    await db.insert(contactSubmissions).values({ name, email, role: role || null, type, message, approved });
  } catch {
    return { success: false, error: "Failed to save your message. Please try again." };
  }

  // Send email notification if Resend is configured
  const apiKey = process.env.RESEND_API_KEY;
  const devEmail = process.env.CONTACT_EMAIL;
  if (apiKey && devEmail) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from: "CodePulse <onboarding@resend.dev>",
        to:   devEmail,
        subject: `[CodePulse] New ${type} from ${name}`,
        html: `
          <h2>New ${type} submission</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          ${role ? `<p><strong>Role:</strong> ${role}</p>` : ""}
          <p><strong>Type:</strong> ${type}</p>
          <hr/>
          <p>${message.replace(/\n/g, "<br/>")}</p>
        `,
      });
    } catch {
      // Email failure is non-blocking — submission already saved
    }
  }

  return { success: true };
}

export async function getApprovedTestimonials() {
  return db
    .select({
      id:      contactSubmissions.id,
      name:    contactSubmissions.name,
      role:    contactSubmissions.role,
      message: contactSubmissions.message,
    })
    .from(contactSubmissions)
    .where(eq(contactSubmissions.approved, true))
    .orderBy(contactSubmissions.createdAt);
}
