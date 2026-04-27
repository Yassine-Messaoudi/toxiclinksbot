import { ModalSubmitInteraction } from "discord.js";

/** Handle modal submissions (extend as needed) */
export async function handleModalSubmit(interaction: ModalSubmitInteraction) {
  const id = interaction.customId;

  // Placeholder for future modal handlers (e.g., ticket reason, report form)
  if (id === "ticket_reason_modal") {
    const reason = interaction.fields.getTextInputValue("reason");
    await interaction.reply({ content: `Ticket reason received: ${reason}`, ephemeral: true });
    return;
  }

  // Unknown modal
  await interaction.reply({ content: "Unknown form submission.", ephemeral: true });
}
