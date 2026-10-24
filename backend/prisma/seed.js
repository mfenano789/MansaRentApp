// ============================================================
// MansaRent — Seed : crée un admin + des annonces de démo
// Usage : npm run seed  (nécessite DATABASE_URL valide)
// ============================================================
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/db.js";

const DAY = 86400000;

const PROPERTIES = [
  { title: "Maison moderne 3 chambres", type: "Maison", rentalType: "Location longue durée", price: 6200000, city: "Conakry", neighborhood: "Kipé", beds: 3, baths: 2, area: 180, featured: true, tag: "En vedette", amenities: ["Climatisation", "Parking"], images: [], description: "Belle maison moderne avec jardin, idéale pour une famille." },
  { title: "Appartement lumineux en ville", type: "Appartement", rentalType: "Location longue durée", price: 3400000, city: "Conakry", neighborhood: "Kaloum", beds: 2, baths: 1, area: 95, featured: true, tag: "Nouveau", amenities: ["Climatisation", "Internet / Fibre"], images: [], description: "Appartement lumineux au cœur de Kaloum, proche des commerces." },
  { title: "Villa de luxe en bord de mer", type: "Villa", rentalType: "Location longue durée", price: 12000000, city: "Conakry", neighborhood: "Camayenne", beds: 5, baths: 4, area: 420, featured: true, tag: "Premium", amenities: ["Piscine", "Sécurité 24/7", "Parking"], images: [], description: "Villa exceptionnelle avec piscine et vue mer." },
  { title: "Studio cosy meublé", type: "Chambre", rentalType: "Court séjour", price: 1100000, city: "Conakry", neighborhood: "Ratoma", beds: 1, baths: 1, area: 35, featured: false, tag: "Court séjour", amenities: ["Meublé", "Internet / Fibre"], images: [], description: "Studio meublé parfait pour un court séjour." },
];

async function main() {
  const adminEmail = "admin@mansarent.com";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        name: "Admin MansaRent",
        email: adminEmail,
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
        roleChosen: true,
        verification: "approved",
        emailVerified: true,
      },
    });
    console.log("Admin créé : admin@mansarent.com / admin123");
  } else {
    console.log("Admin existant :", adminEmail);
    if (!admin.roleChosen) admin = await prisma.user.update({ where: { id: admin.id }, data: { roleChosen: true, verification: "approved" } });
  }
  for (const p of PROPERTIES) {
    const exists = await prisma.property.findFirst({ where: { title: p.title } });
    if (!exists) {
      await prisma.property.create({ data: { ...p, landlordId: admin.id } });
      console.log("Annonce créée :", p.title);
    }
  }
  console.log("Seed terminé ✅");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
