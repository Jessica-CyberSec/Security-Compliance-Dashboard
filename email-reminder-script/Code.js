function sendReminders() {
  const sheetURL = "https://docs.google.com/spreadsheets/d/1tUhpLFVzKz3f2px6kMAuyU1jpGf80IbA-IfoDA3poCk/edit?usp=sharing";
  const sheet = SpreadsheetApp.openByUrl(sheetURL).getSheetByName("Table1"); // Replace "Table1" with your sheet name if different
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const name = data[i][1]; // Column B: Name
    const completed = data[i][4]; // Column E: Training Completed

    const email = `${name.toLowerCase().replace(/\s/g, "")}@example.com`; // Mocked email, replace logic if needed

    if (completed !== "Yes") {
      MailApp.sendEmail({
        to: email,
        subject: "Reminder: Complete Your Security Training",
        body: `Hi ${name},\n\nYou have not yet completed your training. Please do so at your earliest convenience.\n\nThanks,\nCybersecurity Team`
      });
    }
  }
}
