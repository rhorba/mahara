---
name: content-editor
description: >
  Bilingual FR/AR content for Mahara. Trigger on: "translation", "i18n", "fr.json",
  "ar.json", "copy", "label", or any user-facing text.
---

# Content Editor — Mahara

## Voice
- **Empowering for talent**: "Montre ce que tu sais faire." Not patronizing.
- **Professional for business**: "Trouvez le bon profil, au bon prix."
- **Trust-first**: "Paiement sécurisé · Mission vérifiée · Talent certifié"
- **Morocco-native**: use Moroccan city names, MAD currency, local context.

## Key strings (fr.json)

```json
{
  "nav": {
    "browse": "Parcourir les missions", "post": "Publier une mission",
    "talent": "Je suis un talent", "business": "Je recrute",
    "dashboard": "Tableau de bord", "messages": "Messages",
    "proposals": "Mes candidatures", "earnings": "Mes revenus",
    "myGigs": "Mes missions", "payments": "Paiements"
  },
  "gig": {
    "budget": "Budget", "duration": "Durée", "deadline": "Échéance",
    "urgent": "Urgent", "skills": "Compétences requises",
    "category": {
      "design": "Design", "development": "Développement", "marketing": "Marketing",
      "data": "Data & Analyse", "content": "Contenu & Rédaction",
      "translation": "Traduction", "admin": "Administratif", "other": "Autre"
    },
    "status": {
      "draft": "Brouillon", "open": "Ouvert", "in_progress": "En cours",
      "completed": "Terminé", "cancelled": "Annulé", "disputed": "En litige"
    }
  },
  "proposal": {
    "apply": "Candidater", "accept": "Accepter", "reject": "Refuser",
    "withdraw": "Retirer", "matchScore": "Score de compatibilité",
    "status": {
      "pending": "En attente", "accepted": "Acceptée",
      "rejected": "Refusée", "withdrawn": "Retirée"
    }
  },
  "talent": {
    "verification": {
      "unverified": "Non vérifié", "pending": "En cours de vérification",
      "verified": "Vérifié ✓", "top_talent": "Top Talent ⭐"
    },
    "availability": {
      "available": "Disponible", "in_project": "En mission", "unavailable": "Indisponible"
    },
    "level": {
      "junior": "Junior", "intermediate": "Intermédiaire",
      "advanced": "Avancé", "expert": "Expert"
    }
  },
  "escrow": {
    "pending": "En attente de paiement", "funded": "Budget sécurisé",
    "released": "Paiement libéré", "refunded": "Remboursé", "disputed": "En litige",
    "fee": "Frais de service", "yourEarnings": "Vos gains nets",
    "totalCharge": "Total facturé"
  },
  "trust": {
    "verified": "Profil vérifié", "escrowProtected": "Paiement protégé par escrow",
    "noContact": "Coordonnées échangées après acceptation uniquement",
    "hcpData": "Construit sur les données HCP 2026"
  },
  "common": {
    "save": "Enregistrer", "cancel": "Annuler", "search": "Rechercher",
    "loading": "Chargement…", "noResults": "Aucun résultat.", "confirm": "Confirmer",
    "back": "Retour", "viewAll": "Voir tout", "edit": "Modifier", "delete": "Supprimer"
  },
  "auth": {
    "login": "Connexion", "signup": "S'inscrire", "email": "Email",
    "password": "Mot de passe", "orContinueWith": "Ou continuer avec",
    "google": "Google", "forgotPassword": "Mot de passe oublié ?"
  }
}
```

## Arabic (ar.json) — key strings
```json
{
  "nav": {
    "browse": "تصفح المهام", "post": "نشر مهمة",
    "talent": "أنا موهبة", "business": "أنا أوظف",
    "dashboard": "لوحة التحكم", "messages": "الرسائل",
    "proposals": "ترشيحاتي", "earnings": "أرباحي",
    "myGigs": "مهامي", "payments": "المدفوعات"
  },
  "gig": {
    "budget": "الميزانية", "duration": "المدة", "deadline": "الموعد النهائي",
    "urgent": "عاجل", "skills": "المهارات المطلوبة",
    "status": {
      "draft": "مسودة", "open": "مفتوح", "in_progress": "قيد التنفيذ",
      "completed": "مكتمل", "cancelled": "ملغى", "disputed": "متنازع عليه"
    }
  },
  "escrow": {
    "funded": "الميزانية محمية", "released": "تم صرف المبلغ",
    "fee": "رسوم الخدمة", "yourEarnings": "أرباحك الصافية"
  },
  "auth": {
    "login": "تسجيل الدخول", "signup": "إنشاء حساب",
    "email": "البريد الإلكتروني", "password": "كلمة المرور"
  }
}
```

## Rules
- Zero hardcoded user-facing strings (grep-audited in Sprint 6)
- Currency via `Money.formatMAD(value, locale)` — never bake "MAD" in translations
- Match score labels must be identical across FR/AR
- "Escrow" explained plainly in both languages — not assumed to be known
