/**
 * Idempotent demo seed — CLAUDE.md §8
 * Run: pnpm db:seed (requires DATABASE_URL)
 * Demo credentials:
 *   talent:   yasmine@demo.mahara.ma / demo1234
 *   business: hassan@demo.mahara.ma  / demo1234
 */

import * as argon2 from "argon2";
import { eq } from "drizzle-orm";
import { db } from "../client";
import {
  businessProfiles,
  escrows,
  gigs,
  proposals,
  reviews,
  talentProfiles,
  users,
} from "../schema";

const DEMO_PASSWORD = "demo1234";

async function hashPw(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

function id() {
  return crypto.randomUUID();
}

async function seed() {
  console.log("🌱 Seeding demo data...");

  // ─── Skip if already seeded ─────────────────────────────────────────────────
  const existing = await db.query.users.findFirst({
    where: eq(users.email, "yasmine@demo.mahara.ma"),
  });
  if (existing) {
    console.log("✓ Demo data already present — skipping.");
    return;
  }

  const pw = await hashPw(DEMO_PASSWORD);

  // ─── Talent users ─────────────────────────────────────────────────────────

  const yasmineId = id();
  const mehdiId = id();
  const karimaId = id();
  const omarId = id();
  const saraId = id();
  const younesId = id();

  await db.insert(users).values([
    {
      id: yasmineId,
      name: "Yasmine El Mansouri",
      email: "yasmine@demo.mahara.ma",
      role: "talent",
      city: "Casablanca",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: mehdiId,
      name: "Mehdi Benjelloun",
      email: "mehdi@demo.mahara.ma",
      role: "talent",
      city: "Rabat",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: karimaId,
      name: "Karima Alaoui",
      email: "karima@demo.mahara.ma",
      role: "talent",
      city: "Marrakech",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: omarId,
      name: "Omar Tazi",
      email: "omar@demo.mahara.ma",
      role: "talent",
      city: "Fès",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: saraId,
      name: "Sara Benali",
      email: "sara@demo.mahara.ma",
      role: "talent",
      city: "Agadir",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: younesId,
      name: "Younes Chraibi",
      email: "younes@demo.mahara.ma",
      role: "talent",
      city: "Tanger",
      passwordHash: pw,
      isActive: true,
    },
  ]);

  // ─── Business users ──────────────────────────────────────────────────────

  const hassanId = id();
  const nadiaId = id();
  const karimId = id();

  await db.insert(users).values([
    {
      id: hassanId,
      name: "Hassan Ouali",
      email: "hassan@demo.mahara.ma",
      role: "business",
      city: "Casablanca",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: nadiaId,
      name: "Nadia Berrada",
      email: "nadia@demo.mahara.ma",
      role: "business",
      city: "Marrakech",
      passwordHash: pw,
      isActive: true,
    },
    {
      id: karimId,
      name: "Karim Idrissi",
      email: "karim@demo.mahara.ma",
      role: "business",
      city: "Casablanca",
      passwordHash: pw,
      isActive: true,
    },
  ]);

  // ─── Talent profiles ─────────────────────────────────────────────────────

  const yasmineTpId = id();
  const mehdiTpId = id();
  const karimaTpId = id();
  const omarTpId = id();
  const saraTpId = id();
  const younesTpId = id();

  await db.insert(talentProfiles).values([
    {
      id: yasmineTpId,
      userId: yasmineId,
      bio: "Designer UI/UX avec 3 ans d'expérience sur des produits SaaS et e-commerce. Passionnée par l'accessibilité et le design systémique.",
      skills: [
        { skill: "Figma", level: "expert", verified: true },
        { skill: "UI Design", level: "advanced", verified: true },
        { skill: "UX Research", level: "intermediate", verified: false },
      ],
      portfolioUrls: ["https://behance.net/yasmine"],
      languages: ["fr", "ar", "en"],
      hourlyRate: 15000, // 150 MAD
      availability: "available",
      verificationStatus: "top_talent",
      reviewCount: 12,
      avgRating: 480,
      responseRate: 96,
      onTimeRate: 100,
      completedGigs: 12,
    },
    {
      id: mehdiTpId,
      userId: mehdiId,
      bio: "Développeur full-stack spécialisé React/Node.js. 5 ans d'expérience en freelance sur des applications web complexes.",
      skills: [
        { skill: "React", level: "expert", verified: true },
        { skill: "Node.js", level: "advanced", verified: false },
        { skill: "TypeScript", level: "advanced", verified: false },
        { skill: "PostgreSQL", level: "intermediate", verified: false },
      ],
      portfolioUrls: ["https://github.com/mehdi-demo", "https://mehdi.dev"],
      languages: ["fr", "ar"],
      hourlyRate: 20000, // 200 MAD
      availability: "in_project",
      verificationStatus: "verified",
      reviewCount: 8,
      avgRating: 460,
      responseRate: 88,
      onTimeRate: 92,
      completedGigs: 8,
    },
    {
      id: karimaTpId,
      userId: karimaId,
      bio: "Chargée de communication digitale et community manager expérimentée. Expert en stratégie de contenu pour les PME marocaines.",
      skills: [
        { skill: "Community Management", level: "expert", verified: true },
        { skill: "Copywriting", level: "advanced", verified: false },
        { skill: "Instagram", level: "advanced", verified: false },
      ],
      portfolioUrls: [],
      languages: ["fr", "ar", "darija"],
      hourlyRate: 10000, // 100 MAD
      availability: "available",
      verificationStatus: "verified",
      reviewCount: 6,
      avgRating: 450,
      responseRate: 95,
      onTimeRate: 90,
      completedGigs: 6,
    },
    {
      id: omarTpId,
      userId: omarId,
      bio: "Data analyst spécialisé Power BI et Python. Aide les entreprises à transformer leurs données en décisions.",
      skills: [
        { skill: "Power BI", level: "advanced", verified: false },
        { skill: "Python", level: "intermediate", verified: false },
        { skill: "Excel", level: "expert", verified: false },
      ],
      portfolioUrls: [],
      languages: ["fr", "en"],
      hourlyRate: 12000, // 120 MAD
      availability: "available",
      verificationStatus: "pending",
      reviewCount: 2,
      avgRating: 420,
      responseRate: 80,
      onTimeRate: 85,
      completedGigs: 2,
    },
    {
      id: saraTpId,
      userId: saraId,
      bio: "Rédactrice web et traductrice FR/AR/EN. Spécialisée dans les textes marketing et les fiches produits e-commerce.",
      skills: [
        { skill: "Rédaction web", level: "expert", verified: false },
        { skill: "Traduction FR/AR", level: "advanced", verified: false },
        { skill: "SEO", level: "intermediate", verified: false },
      ],
      portfolioUrls: [],
      languages: ["fr", "ar", "en"],
      hourlyRate: 8000, // 80 MAD
      availability: "available",
      verificationStatus: "unverified",
      reviewCount: 0,
      avgRating: 0,
      responseRate: 100,
      onTimeRate: 100,
      completedGigs: 0,
    },
    {
      id: younesTpId,
      userId: younesId,
      bio: "Traducteur professionnel FR/AR/Darija. Ex-interprète pour des ONG internationales, maintenant freelance.",
      skills: [
        { skill: "Traduction FR/AR", level: "expert", verified: true },
        { skill: "Interprétation", level: "advanced", verified: false },
        { skill: "Localisation", level: "intermediate", verified: false },
      ],
      portfolioUrls: [],
      languages: ["fr", "ar", "en", "darija"],
      hourlyRate: 9000, // 90 MAD
      availability: "available",
      verificationStatus: "verified",
      reviewCount: 4,
      avgRating: 490,
      responseRate: 92,
      onTimeRate: 100,
      completedGigs: 4,
    },
  ]);

  // ─── Business profiles ───────────────────────────────────────────────────

  const hassanBpId = id();
  const nadiaBpId = id();
  const karimBpId = id();

  await db.insert(businessProfiles).values([
    {
      id: hassanBpId,
      userId: hassanId,
      companyName: "Souk Digital",
      sector: "E-commerce",
      size: "2-10",
      ice: "001234567",
      website: "https://soukdigital.ma",
      verifiedBusiness: true,
      postedGigs: 4,
      avgRating: 440,
    },
    {
      id: nadiaBpId,
      userId: nadiaId,
      companyName: "Atlas Restauration",
      sector: "Restauration",
      size: "11-50",
      ice: "009876543",
      website: null,
      verifiedBusiness: false,
      postedGigs: 2,
      avgRating: 400,
    },
    {
      id: karimBpId,
      userId: karimId,
      companyName: "ConsultPro Maroc",
      sector: "Conseil & Formation",
      size: "2-10",
      ice: null,
      website: "https://consultpro.ma",
      verifiedBusiness: true,
      postedGigs: 2,
      avgRating: 460,
    },
  ]);

  // ─── Gigs ─────────────────────────────────────────────────────────────────

  const gig1 = id(); // open — design
  const gig2 = id(); // open — development (urgent)
  const gig3 = id(); // in_progress — marketing
  const gig4 = id(); // in_progress — development
  const gig5 = id(); // completed — content
  const gig6 = id(); // completed — translation
  const gig7 = id(); // open — data
  const gig8 = id(); // draft — admin

  await db.insert(gigs).values([
    {
      id: gig1,
      businessId: hassanBpId,
      title: "Refonte complète de la landing page e-commerce",
      description:
        "Nous cherchons un designer UI/UX pour repenser notre landing page principale. Le site vend des produits artisanaux marocains. Objectif : augmenter le taux de conversion. Livrables : maquettes Figma + guide de style.",
      category: "design",
      skills: ["Figma", "UI Design", "UX Research"],
      budget: 200000, // 2000 MAD
      duration: "2 semaines",
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      urgent: false,
      status: "open",
    },
    {
      id: gig2,
      businessId: hassanBpId,
      title: "Développement d'un module de suivi de commandes",
      description:
        "Module de tracking de commandes à intégrer à notre boutique Shopify. Le client doit pouvoir suivre sa commande en temps réel. Stack : React + API Shopify. URGENT — livraison avant fin du mois.",
      category: "development",
      skills: ["React", "TypeScript", "Shopify API"],
      budget: 400000, // 4000 MAD
      duration: "3 semaines",
      deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      urgent: true,
      status: "open",
    },
    {
      id: gig3,
      businessId: nadiaBpId,
      title: "Gestion des réseaux sociaux — 1 mois",
      description:
        "Community management pour nos 3 comptes (Instagram, Facebook, TikTok). Publications quotidiennes, stories, réponse aux commentaires. Cible : 18-35 ans urbains.",
      category: "marketing",
      skills: ["Community Management", "Instagram", "Copywriting"],
      budget: 150000, // 1500 MAD
      duration: "1 mois",
      urgent: false,
      status: "in_progress",
      assignedTalentId: karimaTpId,
    },
    {
      id: gig4,
      businessId: karimBpId,
      title: "Développement d'une application de gestion de formations",
      description:
        "Application web pour gérer nos sessions de formation : inscription des participants, suivi de présence, génération de certificats. Backend Node.js + Frontend React.",
      category: "development",
      skills: ["React", "Node.js", "PostgreSQL"],
      budget: 800000, // 8000 MAD
      duration: "6 semaines",
      urgent: false,
      status: "in_progress",
      assignedTalentId: mehdiTpId,
    },
    {
      id: gig5,
      businessId: hassanBpId,
      title: "Rédaction de 30 fiches produit artisanat",
      description:
        "Rédaction SEO-optimisée de 30 fiches produit pour notre catalogue en ligne. Produits : bijoux, poterie, maroquinerie. Livraison en FR et AR.",
      category: "content",
      skills: ["Rédaction web", "SEO", "Traduction FR/AR"],
      budget: 120000, // 1200 MAD
      duration: "1 semaine",
      urgent: false,
      status: "completed",
      assignedTalentId: saraTpId,
    },
    {
      id: gig6,
      businessId: karimBpId,
      title: "Traduction du manuel de formation FR → AR",
      description:
        "Traduction professionnelle d'un manuel de 80 pages sur la gestion de projets. Du français vers l'arabe standard moderne. Terminologie spécialisée business.",
      category: "translation",
      skills: ["Traduction FR/AR", "Localisation"],
      budget: 180000, // 1800 MAD
      duration: "2 semaines",
      urgent: false,
      status: "completed",
      assignedTalentId: younesTpId,
    },
    {
      id: gig7,
      businessId: nadiaBpId,
      title: "Tableau de bord des ventes Power BI",
      description:
        "Création d'un tableau de bord Power BI pour analyser nos ventes mensuelles par restaurant et par gamme de produits. Données dans Excel (fourni).",
      category: "data",
      skills: ["Power BI", "Excel"],
      budget: 100000, // 1000 MAD
      duration: "1 semaine",
      urgent: false,
      status: "open",
    },
    {
      id: gig8,
      businessId: karimBpId,
      title: "Assistance administrative — saisie de données",
      description: "Saisie et mise en forme de données Excel pour nos dossiers clients.",
      category: "admin",
      skills: ["Excel"],
      budget: 50000, // 500 MAD
      urgent: false,
      status: "draft",
    },
  ]);

  // ─── Proposals ───────────────────────────────────────────────────────────

  const prop1 = id(); // yasmine → gig1 (pending)
  const prop2 = id(); // karima → gig1 (pending)
  const prop3 = id(); // mehdi → gig2 (pending)
  const prop4 = id(); // omar → gig7 (pending)
  const prop5 = id(); // sara → gig5 (accepted + completed)
  const prop6 = id(); // younes → gig6 (accepted + completed)

  await db.insert(proposals).values([
    {
      id: prop1,
      gigId: gig1,
      talentId: yasmineTpId,
      coverLetter:
        "Je suis très enthousiaste à l'idée de travailler sur ce projet. J'ai redesigné 3 boutiques en ligne similaires avec des résultats mesurables (+40% de conversion en moyenne).",
      proposedBudget: 200000,
      estimatedDays: 10,
      status: "pending",
      matchScore: 95,
    },
    {
      id: prop2,
      gigId: gig1,
      talentId: karimaTpId,
      coverLetter:
        "J'ai de l'expérience en design pour l'artisanat marocain et je comprends la cible.",
      proposedBudget: 180000,
      estimatedDays: 14,
      status: "pending",
      matchScore: 62,
    },
    {
      id: prop3,
      gigId: gig2,
      talentId: mehdiTpId,
      coverLetter: "J'ai intégré plusieurs modules Shopify en React. Je peux livrer en 3 semaines.",
      proposedBudget: 400000,
      estimatedDays: 21,
      status: "pending",
      matchScore: 88,
    },
    {
      id: prop4,
      gigId: gig7,
      talentId: omarTpId,
      coverLetter:
        "Power BI est ma spécialité. J'ai livré 8 dashboards similaires pour des restaurants et commerces.",
      proposedBudget: 100000,
      estimatedDays: 5,
      status: "pending",
      matchScore: 91,
    },
    // Accepted proposals for completed gigs (needed for escrow FK)
    {
      id: prop5,
      gigId: gig5,
      talentId: saraTpId,
      coverLetter: "Rédaction bilingue FR/AR, 30 fiches livrées dans les délais.",
      proposedBudget: 120000,
      estimatedDays: 7,
      status: "accepted",
      matchScore: 84,
    },
    {
      id: prop6,
      gigId: gig6,
      talentId: younesTpId,
      coverLetter: "Traduction professionnelle FR/AR, terminologie business maîtrisée.",
      proposedBudget: 180000,
      estimatedDays: 12,
      status: "accepted",
      matchScore: 92,
    },
  ]);

  // ─── Escrows (for completed gigs) ────────────────────────────────────────

  const now = new Date();
  const past = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Completed gig 5 (Sara, content) — escrow released
  await db.insert(escrows).values({
    id: id(),
    gigId: gig5,
    proposalId: prop5,
    businessId: hassanId,
    talentId: saraId,
    grossAmount: 120000,
    platformFeeFromBusiness: 12000, // 10%
    platformFeeFromTalent: 6000, // 5%
    talentPayout: 114000, // 120000 - 6000
    status: "released",
    fundedAt: past(10),
    releasedAt: past(2),
  });

  // Completed gig 6 (Younes, translation) — escrow released
  await db.insert(escrows).values({
    id: id(),
    gigId: gig6,
    proposalId: prop6,
    businessId: karimId,
    talentId: younesId,
    grossAmount: 180000,
    platformFeeFromBusiness: 18000,
    platformFeeFromTalent: 9000,
    talentPayout: 171000,
    status: "released",
    fundedAt: past(15),
    releasedAt: past(5),
  });

  // ─── Reviews (for completed gigs) ────────────────────────────────────────

  await db.insert(reviews).values([
    // gig5: Hassan reviews Sara
    {
      id: id(),
      gigId: gig5,
      reviewerId: hassanId,
      revieweeId: saraId,
      rating: 5,
      comment: "Excellent travail ! Les fiches produit sont parfaites, livrées dans les délais.",
      reviewerRole: "business",
    },
    // gig5: Sara reviews Hassan
    {
      id: id(),
      gigId: gig5,
      reviewerId: saraId,
      revieweeId: hassanId,
      rating: 5,
      comment: "Brief clair, paiement rapide. Client idéal.",
      reviewerRole: "talent",
    },
    // gig6: Karim reviews Younes
    {
      id: id(),
      gigId: gig6,
      reviewerId: karimId,
      revieweeId: younesId,
      rating: 5,
      comment: "Traduction de grande qualité, terminologie professionnelle maîtrisée.",
      reviewerRole: "business",
    },
    // gig6: Younes reviews Karim
    {
      id: id(),
      gigId: gig6,
      reviewerId: younesId,
      revieweeId: karimId,
      rating: 5,
      comment: "Mission claire et bien encadrée. Je recommande.",
      reviewerRole: "talent",
    },
  ]);

  console.log("✅ Demo seed complete!");
  console.log("   Talent login:   yasmine@demo.mahara.ma / demo1234");
  console.log("   Business login: hassan@demo.mahara.ma  / demo1234");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
