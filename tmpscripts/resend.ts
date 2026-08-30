import { sendTemplateEmail } from "../src/lib/email-templates/send-email";
const res = await sendTemplateEmail("order-assistance", "kphenol2@gmail.com", {
  idempotencyKey: "order-assistance-CHC-EK0A0T-D836-manual-2",
  templateData: {
    fullName: "SORO Mamadou",
    reference: "CHC-EK0A0T-D836",
    items: [
      { name: "Cyprus Company Profile (Structure Report)", company: "TRUMEDIA LTD · HE349507", total: "€77.35" },
      { name: "Sanctions Risk Snapshot", company: "TRUMEDIA LTD · HE349507", total: "€34.51" },
      { name: "Cyprus Credit Report", company: "TRUMEDIA LTD · HE349507", total: "€154.70" },
    ],
    total: "€266.56",
    checkoutUrl: "https://companieshousecyprus.com/order/CHC-EK0A0T-D836?token=3bb7fcf862d90a769ee008abb9b15fe40fc303f9cd9a283d",
  },
});
console.log(JSON.stringify(res));
