// Global fetch interceptor to strip AI agent thoughts/traces and paths from API responses
(function() {
  const originalFetch = window.fetch;
  if (!originalFetch) return;

  function sanitizeData(val) {
    if (val === null || val === undefined) {
      return val;
    }
    if (Array.isArray(val)) {
      return val.map(sanitizeData);
    }
    if (typeof val === "object") {
      const cleaned = {};
      for (const [key, value] of Object.entries(val)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey === "thought" ||
          lowerKey === "reasoning" ||
          lowerKey === "plan" ||
          lowerKey === "tool_call" ||
          lowerKey === "debug" ||
          lowerKey === "trace"
        ) {
          continue;
        }
        if (lowerKey === "action") {
          if (typeof value === "string") {
            if (/^[a-zA-Z0-9_\-]+$/.test(value)) {
              cleaned[key] = value;
            }
            continue;
          }
          continue;
        }
        cleaned[key] = sanitizeData(value);
      }
      return cleaned;
    }
    if (typeof val === "string") {
      let s = val;
      s = s.replace(/d:[\\/]csc banner_folder[\\/]130626/gi, "[PROJECT_ROOT]");
      s = s.replace(/c:[\\/]users[\\/]advar/gi, "[USER_HOME]");
      s = s.replace(/let's\s+(do|call|run|check)/gi, "[REDACTED]");
      s = s.replace(/view_file/gi, "[REDACTED]");
      s = s.replace(/inspect\s+code/gi, "[REDACTED]");
      s = s.replace(/targetfile/gi, "[REDACTED]");
      return s;
    }
    return val;
  }

  window.fetch = async function(...args) {
    try {
      const response = await originalFetch.apply(this, args);
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const cloned = response.clone();
        try {
          const json = await cloned.json();
          const sanitized = sanitizeData(json);
          const blob = new Blob([JSON.stringify(sanitized)], { type: "application/json" });
          return new Response(blob, {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        } catch {
          return response;
        }
      }
      return response;
    } catch (err) {
      if (err && err.message) {
        err.message = sanitizeData(err.message);
      }
      throw err;
    }
  };
})();

const navItems = [
  { label: "Home", href: "index.html" },
  {
    label: "EduPoint",
    href: "edupoint.html",
    children: [
      "Exam Form Filling",
      "Admit Card Download",
      "Result Download",
      "Scholarship Form",
      "CCC / O Level",
      "University Services",
      "Photocopy & Printing",
      "Lamination",
      "Online Test",
      "Resume Builder"
    ]
  },
  {
    label: "E-Services",
    href: "online-services.html",
    children: [
      "PAN Card",
      "Ayushman Card",
      "Voter ID",
      "Passport Assistance",
      "Birth Certificate",
      "Income Certificate",
      "Domicile",
      "Caste Certificate",
      "Police Verification"
    ]
  },
  {
    label: "ProServe",
    href: "business-solutions.html",
    children: [
      "GST Registration",
      "MSME Registration",
      "Digital Signature",
      "FSSAI",
      "Shop License",
      "IEC Code",
      "Trademark",
      "Company Registration"
    ]
  },
  {
    label: "OneMart",
    href: "products.html",
    children: [
      "Photo Frames",
      "LED Frames",
      "Magic Mugs",
      "Custom Mugs",
      "Mobile Covers",
      "Spotify Plaques",
      "Logo Stickers",
      "Waterproof Stickers",
      "Holographic Stickers",
      "Custom T-Shirts",
      "Visiting Cards",
      "Acrylic Name Plates",
      "Packaging Stickers",
      "Anime Stickers"
    ]
  }
];

const megaGroups = [
  {
    title: "CSC Services",
    icon: "landmark",
    href: "csc-services.html",
    description: "Citizen benefit and assisted official portal services.",
    items: [
      ["PM Kisan", "csc-services.html#pm-kisan"],
      ["Pension", "csc-services.html#pension"],
      ["Insurance", "csc-services.html#insurance"],
      ["Banking", "csc-services.html#banking"],
      ["Ayushman", "csc-services.html#ayushman"],
      ["Jan Seva", "csc-services.html#jan-seva"]
    ]
  },
  {
    title: "Documentation",
    icon: "files",
    href: "csc-services.html#documentation",
    description: "Typing, printing, scanning and document preparation.",
    items: [
      ["Typing", "csc-services.html#typing"],
      ["Scan", "service-document-scanning.html"],
      ["Print", "service-photocopy-printing.html"],
      ["Lamination", "service-lamination.html"],
      ["Affidavit", "csc-services.html#affidavit"],
      ["Certificates", "csc-services.html#certificates"]
    ]
  },
  {
    title: "Bill & Recharge",
    icon: "smartphone-charging",
    href: "csc-services.html#recharge-bills",
    description: "Utility bill, mobile, DTH and FASTag support.",
    items: [
      ["Mobile Recharge", "csc-services.html#mobile-recharge"],
      ["Electricity Bill", "csc-services.html#electricity-bill"],
      ["FASTag", "csc-services.html#fastag"],
      ["DTH Recharge", "csc-services.html#dth-recharge"],
      ["Water Bill", "csc-services.html#water-bill"]
    ]
  },
  {
    title: "Design Services",
    icon: "paintbrush",
    href: "design-services.html",
    description: "Local business creatives and print-ready design help.",
    items: [
      ["Logo Design", "design-services.html#logo-design"],
      ["Flex Design", "design-services.html#flex-design"],
      ["Visiting Card", "design-services.html#visiting-card"],
      ["Banner Design", "design-services.html#banner-design"],
      ["Social Media Post", "design-services.html#social-media-post"]
    ]
  },
  {
    title: "Travel Services",
    icon: "plane",
    href: "travel-services.html",
    description: "Booking assistance with clear confirmation support.",
    highlight: true,
    items: [
      ["Bus Ticket", "travel-services.html#bus-ticket"],
      ["Train Ticket", "travel-services.html#train-ticket"],
      ["Flight Ticket", "travel-services.html#flight-ticket"],
      ["Hotel Booking", "travel-services.html#hotel-booking"],
      ["Tour Package", "travel-services.html#tour-package"],
      ["Passport Assistance", "travel-services.html#passport-assistance"]
    ]
  }
];

const oneMartGroups = [
  {
    title: "Personalized Gifts",
    icon: "gift",
    href: "products.html#personalized-gifts",
    badge: "Best Seller",
    items: ["Photo Frames", "LED Frames", "Magic Mugs", "Custom Mugs", "Mobile Covers", "Spotify Plaques", "Keychains", "Cushion Printing"]
  },
  {
    title: "Sticker Printing",
    icon: "sticker",
    href: "products.html#sticker-printing",
    badge: "Trending",
    items: ["Logo Stickers", "Waterproof Stickers", "Vinyl Stickers", "Holographic Stickers", "Laptop Stickers", "QR Code Stickers", "Product Labels", "Packaging Stickers"]
  },
  {
    title: "UV DTF Printing",
    icon: "sparkles",
    href: "products.html#uv-dtf-printing",
    badge: "Premium",
    items: ["Cup Branding", "Bottle Branding", "Glass Stickers", "Acrylic Name Plates", "Business Logo Transfers", "Product Branding"]
  },
  {
    title: "T-Shirt Printing",
    icon: "shirt",
    href: "products.html#t-shirt-printing",
    badge: "Best Seller",
    items: ["Custom T-Shirts", "Couple T-Shirts", "Polo T-Shirts", "Hoodies", "DTF Transfers"]
  },
  {
    title: "Business Branding",
    icon: "briefcase-business",
    href: "products.html#business-branding",
    badge: "High Demand",
    items: ["Visiting Cards", "PVC Cards", "Flyers", "Menu Cards", "Barcode Labels", "Thank You Cards"]
  },
  {
    title: "Islamic Products",
    icon: "star",
    href: "products.html#islamic-products",
    anchor: "islamic-products",
    badge: "Curated",
    items: ["Attar Perfume", "Prayer Cap", "Tasbih Counter", "Dates Pack", "Islamic Books", "Gift Sets"]
  },
  {
    title: "Stationery",
    icon: "pencil",
    href: "products.html#stationery",
    anchor: "stationery",
    items: ["Notebooks", "Pens", "Files & Folders", "School Kits", "Office Registers", "Exam Pads"]
  },
  {
    title: "Printer Ink & Refills",
    icon: "droplet",
    href: "products.html#printer-ink",
    anchor: "printer-ink",
    badge: "Daily Need",
    items: ["Epson Ink", "Canon Ink", "HP Ink", "Toner Refill", "Cartridge Support", "Photo Paper"]
  },
  {
    title: "Computer Accessories",
    icon: "monitor",
    href: "products.html#accessories",
    anchor: "accessories",
    items: ["Keyboard", "Mouse", "USB Drive", "Memory Card", "HDMI Cable", "Laptop Stand"]
  },
  {
    title: "Wedding & Events",
    icon: "party-popper",
    href: "products.html#wedding-events",
    items: ["Wedding Cards", "Welcome Boards", "Return Gift Tags", "Photo Booth Props"]
  },
  {
    title: "Home Decor",
    icon: "image",
    href: "products.html#home-decor",
    items: ["Wall Posters", "Canvas Prints", "Photo Tiles", "Refrigerator Magnets"]
  },
  {
    title: "Trending Products",
    icon: "flame",
    href: "products.html#trending-products",
    badge: "Trending",
    items: ["Anime Stickers", "Aesthetic Stickers", "Creator Merchandise", "Mini Photo Prints", "Instagram Branding Kits", "Small Business Packaging Kits"]
  }
];

const productImagePools = {
  "Personalized Gifts": [
    "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1512909006721-3d6018887383?auto=format&fit=crop&w=900&q=82"
  ],
  "Sticker Printing": [
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&w=900&q=82"
  ],
  "UV DTF Printing": [
    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&w=900&q=82"
  ],
  "T-Shirt Printing": [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1562157873-818bc0726f68?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=900&q=82"
  ],
  "Business Branding": [
    "https://images.unsplash.com/photo-1586953208448-b95a79798f07?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1611224923853-80b023f02d71?auto=format&fit=crop&w=900&q=82"
  ],
  "Wedding & Events": [
    "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1507504031003-b417219a0fde?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=82"
  ],
  "Home Decor": [
    "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1493663284031-b7e3aaa4cab7?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1516455207990-7a41ce80f7ee?auto=format&fit=crop&w=900&q=82"
  ],
  "Trending Products": [
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=82",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=82"
  ]
};

const productOverrides = {
  "Photo Frames": { price: 199, rating: "4.8", badge: "Gift Ready", variations: ["A4", "A3", "Wood", "Black"] },
  "LED Frames": { price: 499, rating: "4.9", badge: "Premium", variations: ["8x12", "12x18", "Warm light", "RGB"] },
  "Magic Mugs": { price: 249, rating: "4.9", badge: "Best Seller", variations: ["Black", "Red", "Heart handle", "Gift box"] },
  "Custom Mugs": { price: 149, rating: "4.8", badge: "Fast Print", variations: ["White", "Black", "Name print", "Photo print"] },
  "Mobile Covers": { price: 249, rating: "4.8", badge: "Trending", variations: ["Soft", "Hard", "Glossy", "Matte"] },
  "Spotify Plaques": { price: 299, rating: "4.9", badge: "Trending", variations: ["Acrylic", "Black", "White", "Gift pack"] },
  "Keychains": { price: 69, rating: "4.7", badge: "Quick Gift", variations: ["Acrylic", "Metal", "Round", "Rectangle"] },
  "Cushion Printing": { price: 299, rating: "4.8", badge: "Gift Ready", variations: ["12x12", "16x16", "Single side", "Both side"] },
  "Logo Stickers": { price: 99, rating: "4.9", badge: "Best Seller", variations: ["Matte", "Glossy", "Round", "Die cut"] },
  "Waterproof Stickers": { price: 149, rating: "4.9", badge: "Best Seller", variations: ["Glossy", "Matte", "Transparent", "Outdoor"] },
  "Vinyl Stickers": { price: 149, rating: "4.8", badge: "Durable", variations: ["White vinyl", "Clear vinyl", "Die cut", "Sheet"] },
  "Holographic Stickers": { price: 199, rating: "4.9", badge: "Trending", variations: ["Rainbow", "Silver", "Die cut", "Sheet"] },
  "Laptop Stickers": { price: 99, rating: "4.8", badge: "Youth Pick", variations: ["Anime", "Aesthetic", "Quote", "Custom"] },
  "QR Code Stickers": { price: 79, rating: "4.7", badge: "Business", variations: ["UPI QR", "Menu QR", "Review QR", "Social QR"] },
  "Product Labels": { price: 129, rating: "4.8", badge: "Packaging", variations: ["Jar", "Box", "Bottle", "Custom size"] },
  "Packaging Stickers": { price: 149, rating: "4.9", badge: "Best Seller", variations: ["Thank you", "Logo", "Seal", "Fragile"] },
  "Cup Branding": { price: 199, rating: "4.8", badge: "UV DTF", variations: ["Logo", "Name", "Full wrap", "Gold look"] },
  "Bottle Branding": { price: 199, rating: "4.8", badge: "UV DTF", variations: ["Steel", "Plastic", "Glass", "Logo"] },
  "Glass Stickers": { price: 179, rating: "4.7", badge: "Premium", variations: ["Transparent", "Frosted", "Logo", "Name"] },
  "Acrylic Name Plates": { price: 349, rating: "4.9", badge: "Best Seller", variations: ["Desk", "Door", "Gold", "Clear"] },
  "Business Logo Transfers": { price: 199, rating: "4.8", badge: "Branding", variations: ["Small", "Medium", "Large", "Bulk"] },
  "Product Branding": { price: 249, rating: "4.8", badge: "Premium", variations: ["Logo", "Label", "Transfer", "Combo"] },
  "Custom T-Shirts": { price: 299, rating: "4.9", badge: "Best Seller", variations: ["S", "M", "L", "XL"] },
  "Couple T-Shirts": { price: 599, rating: "4.8", badge: "Gift Ready", variations: ["Pair", "Black", "White", "Custom text"] },
  "Polo T-Shirts": { price: 399, rating: "4.7", badge: "Team Wear", variations: ["S", "M", "L", "XL"] },
  "Hoodies": { price: 799, rating: "4.8", badge: "Winter Pick", variations: ["M", "L", "XL", "Black"] },
  "DTF Transfers": { price: 99, rating: "4.8", badge: "Print Ready", variations: ["A5", "A4", "A3", "Bulk"] },
  "Visiting Cards": { price: 299, rating: "4.9", badge: "Best Seller", variations: ["300 GSM", "Matte", "Glossy", "Premium"] },
  "PVC Cards": { price: 60, rating: "4.8", badge: "Daily Print", variations: ["ID", "Membership", "Staff", "Student"] },
  "Flyers": { price: 399, rating: "4.7", badge: "Marketing", variations: ["A5", "A4", "Both side", "Bulk"] },
  "Menu Cards": { price: 499, rating: "4.8", badge: "Restaurant", variations: ["Laminated", "Fold", "A4", "A3"] },
  "Barcode Labels": { price: 149, rating: "4.7", badge: "Retail", variations: ["Sheet", "Roll", "QR", "Barcode"] },
  "Thank You Cards": { price: 199, rating: "4.8", badge: "Packaging", variations: ["Matte", "Glossy", "Mini", "Custom"] },
  "Wedding Cards": { price: 499, rating: "4.7", badge: "Event Ready", variations: ["Classic", "Premium", "Digital", "Print"] },
  "Welcome Boards": { price: 699, rating: "4.8", badge: "Event Ready", variations: ["Foam", "Flex", "Acrylic", "Standee"] },
  "Return Gift Tags": { price: 99, rating: "4.7", badge: "Wedding", variations: ["Round", "Rectangle", "Gold", "Custom"] },
  "Photo Booth Props": { price: 299, rating: "4.7", badge: "Party", variations: ["Birthday", "Wedding", "Custom", "Set"] },
  "Wall Posters": { price: 149, rating: "4.8", badge: "Decor", variations: ["A4", "A3", "Matte", "Glossy"] },
  "Canvas Prints": { price: 499, rating: "4.8", badge: "Premium", variations: ["12x18", "18x24", "Frame", "No frame"] },
  "Photo Tiles": { price: 199, rating: "4.7", badge: "Decor", variations: ["Square", "Hexagon", "Magnetic", "Foam"] },
  "Refrigerator Magnets": { price: 79, rating: "4.7", badge: "Gift", variations: ["Photo", "Logo", "Round", "Square"] },
  "Anime Stickers": { price: 99, rating: "4.9", badge: "Trending", variations: ["Sheet", "Die cut", "Glossy", "Holographic"] },
  "Aesthetic Stickers": { price: 99, rating: "4.8", badge: "Trending", variations: ["Pastel", "Quote", "Pack", "Custom"] },
  "Creator Merchandise": { price: 349, rating: "4.8", badge: "Creator", variations: ["Sticker pack", "T-shirt", "Mug", "Bundle"] },
  "Mini Photo Prints": { price: 99, rating: "4.8", badge: "Fast Sell", variations: ["Set of 12", "Set of 24", "Matte", "Glossy"] },
  "Instagram Branding Kits": { price: 499, rating: "4.8", badge: "Creator", variations: ["Logo", "Highlights", "Posts", "Full kit"] },
  "Small Business Packaging Kits": { price: 599, rating: "4.9", badge: "Best Seller", variations: ["Starter", "Premium", "Stickers", "Cards"] }
};

const categoryDescriptions = {
  "Personalized Gifts": "Personalized print gifts with photo, name, message and premium packing options.",
  "Sticker Printing": "Clean-cut stickers for logos, products, QR codes, packaging and creator branding.",
  "UV DTF Printing": "Premium transfer-style branding for cups, bottles, glass, acrylic and product surfaces.",
  "T-Shirt Printing": "Custom apparel printing for personal wear, teams, creators and business uniforms.",
  "Business Branding": "Business print essentials for local shops, creators, restaurants and small brands.",
  "Islamic Products": "Curated daily-use Islamic products, gifts and local essentials available through OneMart.",
  "Stationery": "School, office and exam stationery with quick local pickup and bundle support.",
  "Printer Ink & Refills": "Printer ink, toner, refills and photo paper essentials for home and office printing.",
  "Computer Accessories": "Useful computer accessories for everyday work, study and digital service needs.",
  "Wedding & Events": "Event-ready printed items for weddings, birthdays, functions and return gifts.",
  "Home Decor": "Photo-led decor products for rooms, gifting, memories and premium wall display.",
  "Trending Products": "Fast-moving products for creators, small businesses and youth audiences."
};

const oneMartProducts = oneMartGroups.flatMap((group, groupIndex) => {
  const pool = productImagePools[group.title] || productImagePools["Trending Products"];
  return group.items.map((name, index) => {
    const override = productOverrides[name] || {};
    const offset = index % pool.length;
    const images = [...pool.slice(offset), ...pool.slice(0, offset)];
    const slug = slugify(name);
    return {
      slug,
      name,
      category: group.title,
      categorySlug: group.anchor || slugify(group.title),
      icon: group.icon,
      href: `product-detail.html?product=${slug}`,
      price: override.price || 199,
      rating: override.rating || "4.8",
      badge: override.badge || group.badge || "Popular",
      variations: override.variations || ["Standard", "Premium", "Custom", "Bulk"],
      images,
      description: override.description || `${name} with clean print finishing, order-ready proofing and local OneMart support.`,
      short: override.short || categoryDescriptions[group.title],
      groupIndex,
      index
    };
  });
});

const localProductImagePools = {
  "Personalized Gifts": ["assets/happy_customer.png", "assets/happy_indian_customer.png", "assets/indian_student_study.png"],
  "Sticker Printing": ["assets/pan-card-showcase.png", "assets/pan-card-real-bg.png", "assets/contact_hero_bg.png"],
  "UV DTF Printing": ["assets/contact_hero_bg.png", "assets/csc_hero_bg.png", "assets/security-shield.png"],
  "T-Shirt Printing": ["assets/indian_student_study.png", "assets/indian_student_study_bg.png", "assets/happy_customer.png"],
  "Business Branding": ["assets/csc_hero_bg.png", "assets/contact_hero_bg.png", "assets/disclaimer_bg.png"],
  "Wedding & Events": ["assets/happy_indian_customer.png", "assets/happy_customer.png", "assets/contact_hero_bg.png"],
  "Home Decor": ["assets/security-shield.png", "assets/disclaimer_seal.png", "assets/voter_review_bg.png"],
  "Islamic Products": ["assets/disclaimer_seal.png", "assets/happy_customer.png", "assets/security-shield.png"],
  "Stationery": ["assets/indian_student_study_bg.png", "assets/indian_student_study.png", "assets/csc_hero_bg.png"],
  "Printer Ink & Refills": ["assets/pan_card_mockup.png", "assets/pan-card-showcase.png", "assets/contact_hero_bg.png"],
  "Computer Accessories": ["assets/csc_hero_bg.png", "assets/contact_hero_bg.png", "assets/security-shield.png"],
  "Trending Products": ["assets/voter_review_bg.png", "assets/happy_customer.png", "assets/indian_student_study.png"]
};

oneMartProducts.forEach((product) => {
  const localPool = localProductImagePools[product.category] || localProductImagePools["Trending Products"];
  product.images = localPool.map((image) => `${image}?v=product-local-1`);
});

const siteConfig = {
  phone: "+91 9473946181",
  phoneHref: "tel:+919473946181",
  whatsapp: "https://wa.me/919473946181",
  email: "support@bisenonepoint.com",
  hours: "9:00 AM - 8:00 PM",
  logoHeader: "assets/logo-bisen-one-point-footer.svg",
  logoFooter: "assets/logo-bisen-one-point-footer.svg",
  address: "One Point Suvidha Kendra",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=One%20Point%20Suvidha%20Kendra%2C%2026.9136668%2C80.960677",
  mapEmbedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3557.6794410432926!2d80.96067699999999!3d26.9136668!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399957b67a13d94f%3A0xd16b0b38c7f7f320!2sOne%20Point%20Suvidha%20Kendra!5e0!3m2!1sen!2sin!4v1778773792841!5m2!1sen!2sin"
};

const serviceRoutes = {
  "Exam Form Filling": "edupoint.html#exam-form-filling",
  "Admit Card Download": "edupoint.html#admit-card-download",
  "Result Download": "edupoint.html#result-download",
  "Scholarship Form": "edupoint.html#scholarship-form",
  "CCC / O Level": "edupoint.html#ccc-o-level",
  "University Services": "edupoint.html#university-services",
  "Photocopy & Printing": "service-photocopy-printing.html",
  "Print & Scan": "print-scan.html",
  "Photocopy & Print": "service-photocopy-printing.html",
  "Color Printing": "service-color-printing.html",
  "Document Scanning": "service-document-scanning.html",
  "Scanning": "service-document-scanning.html",
  "Lamination": "service-lamination.html",
  "Lamination Support": "service-lamination.html",
  "Online Test": "edupoint.html#online-test",
  "Resume Builder": "edupoint.html#resume",
  "PAN Card": "service-pan-card.html",
  "Ayushman Card": "service-ayushman-card.html",
  "Voter ID": "service-voter-id.html",
  "Voter ID Card": "service-voter-id.html",
  "Passport Assistance": "service-passport-assistance.html",
  "Birth Certificate": "service-birth-certificate.html",
  "Income Certificate": "service-income-certificate.html",
  "Domicile": "service-domicile-certificate.html",
  "Domicile Certificate": "service-domicile-certificate.html",
  "Caste Certificate": "service-caste-certificate.html",
  "Police Verification": "service-police-verification.html",
  "GST Registration": "service-gst-registration.html",
  "MSME Registration": "service-msme-registration.html",
  "Digital Signature": "service-digital-signature.html",
  "Digital Signature (DSC)": "service-digital-signature.html",
  "FSSAI": "service-fssai-license.html",
  "FSSAI License": "service-fssai-license.html",
  "Shop License": "service-shop-license.html",
  "IEC Code": "service-iec-code.html",
  "Trademark": "service-trademark-registration.html",
  "Trademark Registration": "service-trademark-registration.html",
  "Company Registration": "service-company-registration.html",
  "Sticker Printing": "products.html#sticker-printing",
  "UV DTF Printing": "products.html#uv-dtf-printing",
  "T-Shirt Printing": "products.html#t-shirt-printing",
  "Personalized Gifts": "products.html#personalized-gifts",
  "Business Branding": "products.html#business-branding",
  "Wedding & Events": "products.html#wedding-events",
  "Home Decor": "products.html#home-decor",
  "Trending Products": "products.html#trending-products",
  "Photo Frames": "products.html#photo-frames",
  "LED Frames": "products.html#led-frames",
  "Magic Mugs": "products.html#magic-mugs",
  "Custom Mugs": "products.html#custom-mugs",
  "Mobile Covers": "products.html#mobile-covers",
  "Spotify Plaques": "products.html#spotify-plaques",
  "Keychains": "products.html#keychains",
  "Cushion Printing": "products.html#cushion-printing",
  "Logo Stickers": "products.html#logo-stickers",
  "Waterproof Stickers": "products.html#waterproof-stickers",
  "Vinyl Stickers": "products.html#vinyl-stickers",
  "Holographic Stickers": "products.html#holographic-stickers",
  "Laptop Stickers": "products.html#laptop-stickers",
  "QR Code Stickers": "products.html#qr-code-stickers",
  "Product Labels": "products.html#product-labels",
  "Packaging Stickers": "products.html#packaging-stickers",
  "Cup Branding": "products.html#cup-branding",
  "Bottle Branding": "products.html#bottle-branding",
  "Glass Stickers": "products.html#glass-stickers",
  "Acrylic Name Plates": "products.html#acrylic-name-plates",
  "Business Logo Transfers": "products.html#business-logo-transfers",
  "Product Branding": "products.html#product-branding",
  "Custom T-Shirts": "products.html#custom-t-shirts",
  "Couple T-Shirts": "products.html#couple-t-shirts",
  "Polo T-Shirts": "products.html#polo-t-shirts",
  "Hoodies": "products.html#hoodies",
  "DTF Transfers": "products.html#dtf-transfers",
  "Visiting Cards": "products.html#visiting-cards",
  "PVC Cards": "products.html#pvc-cards",
  "Flyers": "products.html#flyers",
  "Menu Cards": "products.html#menu-cards",
  "Barcode Labels": "products.html#barcode-labels",
  "Thank You Cards": "products.html#thank-you-cards",
  "Wedding Cards": "products.html#wedding-cards",
  "Welcome Boards": "products.html#welcome-boards",
  "Return Gift Tags": "products.html#return-gift-tags",
  "Photo Booth Props": "products.html#photo-booth-props",
  "Wall Posters": "products.html#wall-posters",
  "Canvas Prints": "products.html#canvas-prints",
  "Photo Tiles": "products.html#photo-tiles",
  "Refrigerator Magnets": "products.html#refrigerator-magnets",
  "Anime Stickers": "products.html#anime-stickers",
  "Aesthetic Stickers": "products.html#aesthetic-stickers",
  "Creator Merchandise": "products.html#creator-merchandise",
  "Mini Photo Prints": "products.html#mini-photo-prints",
  "Instagram Branding Kits": "products.html#instagram-branding-kits",
  "Small Business Packaging Kits": "products.html#small-business-packaging-kits",
  "PM Kisan": "csc-services.html#pm-kisan",
  "Pension": "csc-services.html#pension",
  "Insurance": "csc-services.html#insurance",
  "Banking": "csc-services.html#banking",
  "Ayushman": "csc-services.html#ayushman",
  "Jan Seva": "csc-services.html#jan-seva",
  "Typing": "csc-services.html#typing",
  "Scan": "service-document-scanning.html",
  "Print": "service-photocopy-printing.html",
  "Affidavit": "csc-services.html#affidavit",
  "Certificates": "csc-services.html#certificates",
  "Mobile Recharge": "csc-services.html#mobile-recharge",
  "Electricity Bill": "csc-services.html#electricity-bill",
  "FASTag": "csc-services.html#fastag",
  "DTH Recharge": "csc-services.html#dth-recharge",
  "Water Bill": "csc-services.html#water-bill",
  "Logo Design": "design-services.html#logo-design",
  "Flex Design": "design-services.html#flex-design",
  "Visiting Card": "design-services.html#visiting-card",
  "Banner Design": "design-services.html#banner-design",
  "Social Media Post": "design-services.html#social-media-post",
  "Design Services": "design-services.html",
  "Bus Ticket": "travel-services.html#bus-ticket",
  "Train Ticket": "travel-services.html#train-ticket",
  "Flight Ticket": "travel-services.html#flight-ticket",
  "Hotel Booking": "travel-services.html#hotel-booking",
  "Tour Package": "travel-services.html#tour-package"
};

const mobileServiceGroups = [
  {
    title: "Services",
    icon: "grid-3x3",
    href: "services.html",
    items: [
      ["PAN Card", "service-pan-card.html"],
      ["Ayushman Card", "service-ayushman-card.html"],
      ["Voter ID", "service-voter-id.html"],
      ["GST Registration", "service-gst-registration.html"],
      ["MSME Registration", "service-msme-registration.html"],
      ["Student Services", "edupoint.html"],
      ["Design Services", "design-services.html"],
      ["CSC & Utilities", "csc-services.html"]
    ]
  },
  {
    title: "Travel",
    icon: "plane",
    href: "travel-services.html",
    items: [
      ["Bus Ticket", "travel-services.html#bus-ticket"],
      ["Train Ticket", "travel-services.html#train-ticket"],
      ["Flight Ticket", "travel-services.html#flight-ticket"],
      ["Hotel Booking", "travel-services.html#hotel-booking"],
      ["Tour Package", "travel-services.html#tour-package"],
      ["Passport Assistance", "travel-services.html#passport-assistance"]
    ]
  },
  {
    title: "Store",
    icon: "shopping-bag",
    href: "products.html",
    items: [
      ["Sticker Printing", "products.html#sticker-printing"],
      ["UV DTF Printing", "products.html#uv-dtf-printing"],
      ["T-Shirt Printing", "products.html#t-shirt-printing"],
      ["Personalized Gifts", "products.html#personalized-gifts"],
      ["Business Branding", "products.html#business-branding"]
    ]
  }
];

const searchIndex = [
  { term: "pan banana hai pan card apply", title: "PAN Card Apply", href: "service-pan-card.html" },
  { term: "admit card download hall ticket", title: "Admit Card Download", href: "edupoint.html#admit-card-download" },
  { term: "gst registration gst number goods services tax", title: "GST Registration", href: "service-gst-registration.html" },
  { term: "resume builder cv job application internship", title: "Resume Builder", href: "edupoint.html#resume" },
  { term: "onemart printing stickers mugs tshirt gifts branding", title: "OneMart Printing Store", href: "products.html#onemart-catalog" },
  { term: "ayushman card health card pmjay", title: "Ayushman Card", href: "service-ayushman-card.html" },
  { term: "bus ticket train ticket flight ticket hotel booking tour", title: "Travel Services", href: "travel-services.html" },
  { term: "voter id election card voter registration", title: "Voter ID", href: "service-voter-id.html" },
  { term: "passport passport form passport appointment", title: "Passport Assistance", href: "service-passport-assistance.html" },
  { term: "birth certificate janam praman patra", title: "Birth Certificate", href: "service-birth-certificate.html" },
  { term: "income certificate aay praman patra", title: "Income Certificate", href: "service-income-certificate.html" },
  { term: "domicile niwas praman patra residence", title: "Domicile Certificate", href: "service-domicile-certificate.html" },
  { term: "caste certificate jati praman patra obc sc st", title: "Caste Certificate", href: "service-caste-certificate.html" },
  { term: "police verification character certificate", title: "Police Verification", href: "service-police-verification.html" },
  { term: "msme udyam registration small business", title: "MSME Registration", href: "service-msme-registration.html" },
  { term: "digital signature dsc class 3", title: "Digital Signature", href: "service-digital-signature.html" },
  { term: "fssai food license food business", title: "FSSAI Registration", href: "service-fssai-license.html" },
  { term: "shop license dukaan license trade license", title: "Shop License", href: "service-shop-license.html" },
  { term: "trademark brand registration tm", title: "Trademark", href: "service-trademark-registration.html" },
  { term: "company registration pvt ltd startup private limited", title: "Company Registration", href: "service-company-registration.html" },
  { term: "logo design logo banana brand logo", title: "Logo Design", href: "design-services.html#logo-design" },
  { term: "flex design banner design print", title: "Flex / Banner Design", href: "design-services.html#flex-design" },
  { term: "visiting card business card", title: "Visiting Card", href: "design-services.html#visiting-card" },
  { term: "social media post facebook instagram", title: "Social Media Post", href: "design-services.html#social-media-post" },
  { term: "scholarship form chatravritti up scholarship", title: "Scholarship Form", href: "edupoint.html#scholarship-form" },
  { term: "exam form ssc railway upsc up police", title: "Exam Form Filling", href: "edupoint.html#exam-form-filling" },
  { term: "result download mark sheet result check", title: "Result Download", href: "edupoint.html#result-download" },
  { term: "ccc o level computer course tally", title: "CCC / O Level", href: "edupoint.html#ccc-o-level" },
  { term: "mobile recharge jio airtel bsnl vi", title: "Mobile Recharge", href: "csc-services.html#mobile-recharge" },
  { term: "electricity bill bijli bill uppcl", title: "Electricity Bill", href: "csc-services.html#electricity-bill" },
  { term: "fastag recharge toll highway", title: "FASTag Recharge", href: "csc-services.html#fastag" },
  { term: "dth recharge tata sky dish tv airtel", title: "DTH Recharge", href: "csc-services.html#dth-recharge" },
  { term: "pm kisan kisan samman nidhi farmer", title: "PM Kisan", href: "csc-services.html#pm-kisan" },
  { term: "pension old age widow atal pension", title: "Pension", href: "csc-services.html#pension" },
  { term: "insurance pmsby pmjjby jeevan jyoti", title: "Insurance", href: "csc-services.html#insurance" },
  { term: "photocopy print lamination scan xerox", title: "Print & Scan", href: "print-scan.html" },
  { term: "tour package yatra travel package", title: "Tour Package", href: "travel-services.html#tour-package" },
  { term: "iec code import export trading", title: "IEC Code", href: "service-iec-code.html" },
  { term: "logo sticker waterproof sticker vinyl holographic label packaging print", title: "Sticker Printing", href: "products.html#sticker-printing" },
  { term: "uv dtf cup bottle glass acrylic name plate logo transfer branding", title: "UV DTF Printing", href: "products.html#uv-dtf-printing" },
  { term: "custom tshirt t shirt hoodie polo couple dtf transfer", title: "T-Shirt Printing", href: "products.html#t-shirt-printing" },
  { term: "photo frame led frame magic mug mobile cover spotify plaque gift", title: "Personalized Gifts", href: "products.html#personalized-gifts" },
  { term: "visiting card pvc flyer menu card barcode thank you card business branding", title: "Business Branding", href: "products.html#business-branding" },
  { term: "about us company info one point", title: "About Us", href: "about.html" },
  { term: "contact whatsapp helpline support", title: "Contact Support", href: "contact.html" },
  { term: "track application status check", title: "Track Application", href: "track-application.html" }
];

function getCurrentPage() {
  const path = window.location.pathname.split("/").pop();
  return path || "index.html";
}

function icon(name, size = 18) {
  return `<i data-lucide="${name}" aria-hidden="true" style="width:${size}px;height:${size}px"></i>`;
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const panServiceTypes = new Set(["New PAN", "PAN Correction", "E-PAN Download", "Card Reprint"]);
const servicePageByCategory = {
  "e-services": "online-services.html",
  "csc-services": "csc-services.html",
  proserve: "business-solutions.html",
  business: "business-solutions.html",
  student: "edupoint.html",
  edupoint: "edupoint.html",
  "print-scan": "print-scan.html",
  documentation: "print-scan.html",
  travel: "travel-services.html",
  "travel-services": "travel-services.html",
  design: "design-services.html",
  "design-services": "design-services.html",
  onemart: "products.html",
  products: "products.html",
  support: "support.html"
};

function serviceApplyHref(service, category = "general") {
  const serviceName = (service || "General Support").trim();
  const directRoute = serviceRoutes?.[serviceName];
  const directPage = directRoute ? directRoute.split("#")[0] : "";
  const categoryPage = servicePageByCategory[category] || "";
  const targetPage = isPanServiceLabel(serviceName)
    ? "service-pan-card.html"
    : (directPage || categoryPage || getCurrentPage());
  const params = new URLSearchParams();
  params.set("service", serviceName);
  return `${targetPage}?${params.toString()}#apply-now`;
}

function isPanServiceLabel(label = "") {
  const value = label.toLowerCase();
  return /(^|\s|-)pan(\s|-|$)|e-pan|card reprint/.test(value) && !value.includes("ayushman");
}

function redirectLegacyServiceContact() {
  if (getCurrentPage() !== "contact.html") return;
  const params = new URLSearchParams(window.location.search);
  const service = params.get("service");
  if (!service) return;
  window.location.replace(serviceApplyHref(service, params.get("category") || "general"));
}

function productBySlug(slug) {
  return oneMartProducts.find((product) => product.slug === slug);
}

function productByName(name) {
  return oneMartProducts.find((product) => product.name === name);
}

function routeForService(label, fallback = "contact.html") {
  const product = productByName(label);
  if (product) return product.href;
  return serviceRoutes[label] || fallback;
}

function contactHref(service, category = "general") {
  return serviceApplyHref(service, category);
}

const serviceIcons = {
  "Exam Form Filling": "file-text",
  "Admit Card Download": "download",
  "Result Download": "award",
  "Scholarship Form": "book-open",
  "CCC / O Level": "monitor",
  "University Services": "graduation-cap",
  "Photocopy & Printing": "printer",
  "Lamination": "layers",
  "Online Test": "check-circle",
  "Resume Builder": "file-user",
  "PAN Card": "credit-card",
  "Ayushman Card": "heart-pulse",
  "Voter ID": "vote",
  "Passport Assistance": "plane",
  "Birth Certificate": "baby",
  "Income Certificate": "indian-rupee",
  "Domicile": "home",
  "Domicile Certificate": "home",
  "Caste Certificate": "users",
  "Police Verification": "shield",
  "GST Registration": "calculator",
  "MSME Registration": "factory",
  "Digital Signature": "key",
  "FSSAI": "utensils",
  "Shop License": "store",
  "IEC Code": "globe",
  "Trademark": "stamp",
  "Company Registration": "building"
};

const overviewIcons = {
  "EduPoint": "graduation-cap",
  "E-Services": "globe-2",
  "ProServe": "briefcase"
};

const servicesMegaGroups = [
  {
    title: "E-Services",
    icon: "globe",
    desc: "PAN, Ayushman, voter ID, passport and certificates.",
    href: "online-services.html",
    items: [
      ["PAN Card Assistance", "service-pan-card.html", "Apply for new PAN card or request corrections.", "credit-card"],
      ["Ayushman Card", "service-ayushman-card.html", "Get health insurance cover up to 5 Lakhs under PMJAY.", "heart"],
      ["Voter ID Card", "service-voter-id.html", "Apply for new Voter ID card or update details.", "user-check"],
      ["Passport Assistance", "service-passport-assistance.html", "File fresh passport applications or renewals.", "file-text"],
      ["Birth Certificate", "service-birth-certificate.html", "Hospital birth registration and certificate copy support.", "file-badge"],
      ["Income Certificate", "service-income-certificate.html", "Income proof application for scholarship and official use.", "indian-rupee"],
      ["Domicile Certificate", "service-domicile-certificate.html", "Residence certificate support for state benefits.", "home"],
      ["Caste Certificate", "service-caste-certificate.html", "Caste certificate application and document guidance.", "users"],
      ["Police Verification", "service-police-verification.html", "Character certificate and verification support.", "shield-check"]
    ]
  },
  {
    title: "EduPoint",
    icon: "graduation-cap",
    desc: "Exam forms, admit cards, results, scholarship forms and resume support.",
    href: "edupoint.html",
    items: [
      ["Exam Form Filling", "edupoint.html#exam-form-filling", "Online submission for board and university exams.", "edit-3"],
      ["Admit Card Download", "edupoint.html#admit-card-download", "Get admit cards for various competitive exams.", "download-cloud"],
      ["Result Download", "edupoint.html#result-download", "Check board, university, and job exam results.", "check-square"],
      ["Scholarship Forms", "edupoint.html#scholarship-form", "Apply for state and national student scholarship schemes.", "graduation-cap"],
      ["Resume Builder", "edupoint.html#resume", "Create professional resumes with customized layouts.", "file-spreadsheet"]
    ]
  },
  {
    title: "ProServe",
    icon: "briefcase",
    desc: "GST, MSME, DSC, FSSAI, shop license, IEC and trademarks.",
    href: "business-solutions.html",
    items: [
      ["GST Registration", "service-gst-registration.html", "GST registration, profile review and return guidance.", "coins"],
      ["MSME Registration", "service-msme-registration.html", "Register your business for Udyam/MSME benefits.", "building-2"],
      ["Digital Signature (DSC)", "service-digital-signature.html", "Obtain Class 3 secure digital signature tokens.", "key-round"],
      ["FSSAI License", "service-fssai-license.html", "Food registration and licensing for restaurants/shops.", "utensils"],
      ["Shop License", "service-shop-license.html", "Trade and local authority shop registration support.", "store"],
      ["IEC Code", "service-iec-code.html", "Import-Export Code guidance for DGFT filing.", "ship"],
      ["Trademark Registration", "service-trademark-registration.html", "Brand name, logo and class selection support.", "badge-tm"],
      ["Company Registration", "service-company-registration.html", "Pvt Ltd, LLP, OPC and partnership setup guidance.", "building"]
    ]
  },
  {
    title: "OneMart",
    icon: "shopping-bag",
    desc: "Islamic products, stationery, printer ink and computer accessories.",
    href: "products.html",
    items: [
      ["Islamic Products", "products.html#islamic-products", "Purchase authentic perfumes, books, and dates.", "star"],
      ["Stationery Items", "products.html#stationery", "Pens, notebooks, files, and daily school supplies.", "pencil"],
      ["Printer Ink & Refills", "products.html#printer-ink", "High-quality inks for Epson, Canon, and HP printers.", "droplet"],
      ["Computer Accessories", "products.html#accessories", "Keyboards, mice, USB drives, and cables.", "monitor"]
    ]
  },
  {
    title: "Travel Services",
    icon: "plane",
    desc: "Bus, train, flight, hotel, tour and passport travel support.",
    href: "travel-services.html",
    items: [
      ["Bus Ticket", "travel-services.html#bus-ticket", "Book sleeper and AC bus tickets across major routes.", "bus"],
      ["Train Ticket", "travel-services.html#train-ticket", "IRCTC authorized railway ticket booking assistance.", "train"],
      ["Flight Ticket", "travel-services.html#flight-ticket", "Domestic and international flight ticket bookings.", "plane"],
      ["Hotel Booking", "travel-services.html#hotel-booking", "Budget-friendly hotel room reservations.", "hotel"]
    ]
  },
  {
    title: "CSC & Utility Services",
    icon: "layers",
    desc: "PM Kisan, pension, insurance, banking, bills and documentation categories.",
    href: "csc-services.html",
    items: [
      ["PM Kisan", "csc-services.html#pm-kisan", "Verify KYC and status for PM Kisan Samman Nidhi.", "sprout"],
      ["Pension Services", "csc-services.html#pension", "Old age, widow, and disability pension schemes.", "shield"],
      ["Insurance Support", "csc-services.html#insurance", "Life, health, and vehicle insurance policies.", "heart-handshake"],
      ["Banking Services", "csc-services.html#banking", "AEPS cash withdrawal, deposits, and accounts.", "wallet"]
    ]
  },
  {
    title: "Print & Scan",
    icon: "printer",
    desc: "Photocopy, color print, scanning, lamination and ID card printing.",
    href: "print-scan.html",
    items: [
      ["Photocopy & Print", "service-photocopy-printing.html", "B&W and color page printing from mobile/email.", "copy"],
      ["Color Printing", "service-color-printing.html", "Premium photo printing and document copies.", "image"],
      ["Document Scanning", "service-document-scanning.html", "Scan certificates and forms to PDF or JPEG formats.", "scan"],
      ["Lamination Support", "service-lamination.html", "Protect cards and certificates with plastic seal.", "layers"]
    ]
  },
  {
    title: "Design Services",
    icon: "palette",
    desc: "Visiting card, banner, flex, logo and small business brand support.",
    href: "design-services.html",
    items: [
      ["Visiting Card", "design-services.html#visiting-card", "Custom business card designs with premium finish.", "contact"],
      ["Banner Design", "design-services.html#banner-design", "Promotional banners for shops, events, and festivals.", "layout"],
      ["Flex & Banner", "design-services.html#flex-design", "High-resolution flex banner layout and printing.", "maximize"],
      ["Logo Design", "design-services.html#logo-design", "Unique brand logo creations for small businesses.", "palette"]
    ]
  },
  {
    title: "Recharge & Bills",
    icon: "smartphone",
    desc: "Mobile recharge, electricity bill, DTH recharge and utility support.",
    href: "csc-services.html#recharge-bills",
    items: [
      ["Mobile Recharge", "csc-services.html#mobile-recharge", "Prepaid and postpaid recharges for Jio, Airtel, VI.", "smartphone"],
      ["Electricity Bill", "csc-services.html#electricity-bill", "Pay electricity bills online without extra charges.", "zap"],
      ["DTH Recharge", "csc-services.html#dth-recharge", "Recharge Tata Play, Dish TV, Airtel DTH, Videocon.", "tv"],
      ["FASTag Recharge", "csc-services.html#fastag", "Instant highway toll card recharge assistance.", "tag"]
    ]
  }
];

function renderNav() {
  const navRoot = document.querySelector("[data-site-nav]");
  if (!navRoot) return;

  const current = getCurrentPage();

  const megaHtml = `
    <div class="mega-split-container">
      <div class="mega-sidebar">
        ${servicesMegaGroups.map((group, idx) => `
          <a class="mega-sidebar-item${idx === 0 ? ' active' : ''}" data-sidebar-idx="${idx}" href="${group.href}">
            <span class="sidebar-item-title">${icon(group.icon, 16)} <span>${group.title}</span></span>
            ${icon("chevron-right", 14)}
          </a>
        `).join("")}
      </div>
      <div class="mega-content-panel" style="opacity: 1; transition: opacity 0.15s ease;">
        <div class="mega-content-header">
          <h3 class="mega-content-title">${servicesMegaGroups[0].title}</h3>
          <p class="mega-content-desc">${servicesMegaGroups[0].desc}</p>
          <a class="mega-browse-link" href="${servicesMegaGroups[0].href}">Browse all ${servicesMegaGroups[0].title} ${icon("arrow-right", 13)}</a>
        </div>
        <div class="mega-items-grid">
          ${servicesMegaGroups[0].items.map(([label, href, desc, iconName]) => `
            <a class="mega-grid-item" href="${href}">
              <div class="mega-grid-item-icon">
                ${icon(iconName || 'file-text', 18)}
              </div>
              <div class="mega-grid-item-content">
                <h4 class="mega-grid-item-title">${label}</h4>
                <p class="mega-grid-item-desc">${desc || 'Access online application and support services.'}</p>
              </div>
            </a>
          `).join("")}
        </div>
      </div>
    </div>
  `;

  const newNavItems = [
    { label: "Home", href: "index.html" },
    { label: "Services", href: "services.html", isMega: true },
    { label: "Travel", href: "travel-services.html" },
    { label: "Track Status", href: "track-application.html" },
    { label: "Portals", isPortals: true }
  ];

  const desktopNavHtml = newNavItems.map(item => {
    const active = current === item.href ? "active" : "";
    if (item.isMega) {
      return `
        <div class="nav-item nav-item-mega">
          <a class="nav-trigger ${active}" href="${item.href}" aria-haspopup="true" aria-expanded="false" data-dropdown-trigger>${item.label} ${icon("chevron-down", 15)}</a>
          <div class="mega-menu utilities-mega onemart-mega" aria-label="Services Categories">
            ${megaHtml}
          </div>
        </div>
      `;
    }
    if (item.isPortals) {
      return `
        <div class="nav-item nav-item-portals">
          <button class="nav-trigger" type="button" aria-haspopup="true" aria-expanded="false">
            ${icon("user", 16)} ${item.label} ${icon("chevron-down", 15)}
          </button>
          <div class="submenu portals-submenu" aria-label="Portals">
            <a href="dashboard.html" class="portal-menu-link">
              ${icon("user-circle", 18)} Customer Profile
            </a>
            <a href="admin.html" class="portal-menu-link">
              ${icon("shield-check", 18)} Admin Dashboard
            </a>
            <div class="portal-menu-divider"></div>
            <a href="login.html" class="portal-menu-link">
              ${icon("log-in", 18)} Secure Login
            </a>
          </div>
        </div>
      `;
    }
    return `<a class="nav-link ${active}" href="${item.href}">${item.label}</a>`;
  }).join("");

  const mobileAccordions = servicesMegaGroups.map(group => `
    <div class="mobile-accordion">
      <button class="nav-trigger" type="button" aria-expanded="false" data-mobile-accordion>
        <span>${icon(group.icon, 17)} ${group.title}</span>
        ${icon("chevron-down", 15)}
      </button>
      <div class="mobile-accordion-panel">
        <a class="mobile-overview-link" href="${group.href}">${group.title} Overview</a>
        ${group.items.map(([label, href]) => `<a href="${href}">${label}</a>`).join("")}
      </div>
    </div>
  `).join("");

  navRoot.innerHTML = `
    <header class="site-header">
      <div class="top-contact-bar">
        <div class="top-contact-inner">
          <div class="top-contact-links">
            <a href="${siteConfig.phoneHref}" class="top-contact-link">${icon("phone", 14)} ${siteConfig.phone}</a>
            <a href="${siteConfig.whatsapp}" target="_blank" class="top-contact-link">${icon("message-circle", 14)} WhatsApp</a>
            <a href="mailto:${siteConfig.email}" class="top-contact-link hide-mobile-sm">${icon("mail", 14)} ${siteConfig.email}</a>
          </div>
          <div class="top-contact-links hide-mobile-sm top-hours">
            <span>${icon("clock", 14)} ${siteConfig.hours}</span>
          </div>
        </div>
      </div>
      <nav class="nav-bar" aria-label="Primary">
        <a class="brand" href="index.html" aria-label="One Point Digital Services home">
          <img class="brand-logo brand-logo-header" src="${siteConfig.logoHeader}" alt="Bisen One Point Suvidha Kendra">
        </a>
        <div class="nav-menu" id="nav-menu">
          <div class="desktop-nav-menu">
            ${desktopNavHtml}
          </div>
          <div class="mobile-nav-menu">
            <a class="nav-link ${current === "index.html" ? "active" : ""}" href="index.html">${icon("home", 17)} Home</a>
            ${mobileAccordions}
            <div class="mobile-accordion">
              <button class="nav-trigger" type="button" aria-expanded="false" data-mobile-accordion>
                <span>${icon("user", 17)} Portals & Login</span>
                ${icon("chevron-down", 15)}
              </button>
              <div class="mobile-accordion-panel">
                <a href="dashboard.html">${icon("user-circle", 14)} Customer Profile</a>
                <a href="admin.html">${icon("shield-check", 14)} Admin Dashboard</a>
                <a href="login.html">${icon("log-in", 14)} Secure Login</a>
              </div>
            </div>
            <a class="nav-link ${current === "track-application.html" ? "active" : ""}" href="track-application.html">${icon("search", 17)} Track Status</a>
            <a class="nav-link ${current === "contact.html" ? "active" : ""}" href="contact.html">${icon("message-circle", 17)} Contact Support</a>
          </div>
        </div>
        <div class="nav-actions">
          <button class="icon-button cart-nav-button nav-action-glass" type="button" aria-label="Open OneMart cart" title="Cart" data-cart-button>${icon("shopping-cart", 19)}<span data-cart-count>0</span></button>
          <a class="icon-button hide-mobile-sm nav-action-glass" href="dashboard.html" aria-label="Customer Profile" title="Customer Profile">${icon("user", 19)}</a>
          <a class="btn btn-gold" href="services.html">${icon("sparkles", 18)} Get Started</a>
          <button class="icon-button mobile-toggle nav-action-glass" aria-label="Open menu" aria-expanded="false" data-mobile-toggle>${icon("menu", 21)}</button>
        </div>
      </nav>
    </header>
  `;
}

function renderFooter() {
  const footerRoot = document.querySelector("[data-site-footer]");
  if (!footerRoot) return;

  footerRoot.innerHTML = `
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-top">
          <div class="footer-brand-block">
            <a class="brand footer-brand" href="index.html">
              <img class="brand-logo brand-logo-footer" src="${siteConfig.logoFooter}" alt="Bisen One Point Suvidha Kendra">
            </a>
            <p>Digital, government, student, business and store services with local guidance, UPI receipt support and application tracking.</p>
            <div class="footer-contact-row">
              <span>${icon("map-pin", 16)} ${siteConfig.address}</span>
              <span>${icon("clock", 16)} ${siteConfig.hours}</span>
            </div>
            <div class="footer-actions">
              <a class="btn footer-pill" href="${siteConfig.whatsapp}" target="_blank">${icon("message-circle", 18)} Chat on WhatsApp</a>
              <a class="btn footer-pill" href="${siteConfig.mapUrl}" target="_blank">${icon("map", 18)} View Location on Google Maps</a>
            </div>
          </div>
          <div class="footer-map-card">
            <iframe title="One Point Digital Services location map" src="${siteConfig.mapEmbedUrl}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <div>
              <strong>${siteConfig.address}</strong>
              <span>Exact visit details can be confirmed on WhatsApp before arrival.</span>
            </div>
          </div>
        </div>
        <div class="footer-middle">
          <div>
            <h4>Services</h4>
            <div class="footer-links">
              <a href="service-pan-card.html">PAN Card</a>
              <a href="service-ayushman-card.html">Ayushman Card</a>
              <a href="service-gst-registration.html">GST Registration</a>
            </div>
          </div>
          <div>
            <h4>Students</h4>
            <div class="footer-links">
              <a href="edupoint.html#exam-form-filling">Exam Forms</a>
              <a href="edupoint.html#admit-card-download">Admit Card</a>
              <a href="edupoint.html#resume">Resume Builder</a>
              <a href="edupoint.html#ccc-o-level">CCC / O Level</a>
            </div>
          </div>
          <div>
            <h4>Store</h4>
            <div class="footer-links">
              <a href="products.html#sticker-printing">Sticker Printing</a>
              <a href="products.html#uv-dtf-printing">UV DTF</a>
              <a href="products.html#t-shirt-printing">T-Shirts</a>
              <a href="products.html#personalized-gifts">Personalized Gifts</a>
            </div>
          </div>
          <div>
            <h4>Support</h4>
            <div class="footer-links">
              <a href="track-application.html">Track Application</a>
              <a href="support.html">Support Center</a>
              <a href="about.html">About One Point</a>
              <a href="faq.html">FAQ</a>
              <a href="contact.html">Contact Us</a>
              <a href="${siteConfig.whatsapp}" target="_blank">WhatsApp Help</a>
            </div>
          </div>
          <div>
            <h4>Legal</h4>
            <div class="footer-links">
              <a href="privacy.html">Privacy Policy</a>
              <a href="terms.html">Terms</a>
              <a href="refund-policy.html">Refund Policy</a>
              <a href="disclaimer.html">Disclaimer</a>
            </div>
          </div>
        </div>
        <div class="footer-trust-badges">
          <div class="trust-badge-item">
            ${icon("credit-card", 15)}
            <span>Secure Payments</span>
          </div>
          <div class="trust-badge-item">
            ${icon("shield-check", 15)}
            <span>SSL Protected</span>
          </div>
          <div class="trust-badge-item">
            ${icon("lock", 15)}
            <span>Data Privacy</span>
          </div>
          <div class="trust-badge-item">
            ${icon("map-pin", 15)}
            <span>Local Support</span>
          </div>
          <div class="trust-badge-item">
            ${icon("file-check-2", 15)}
            <span>Govt Assistance</span>
          </div>
        </div>
        <div class="footer-bottom">
          <span>2026 One Point Digital Services. All rights reserved.</span>
          <span class="footer-bottom-links">
            <a href="${siteConfig.phoneHref}">${siteConfig.phone}</a>
            <a href="mailto:${siteConfig.email}">${siteConfig.email}</a>
            <a href="privacy.html">Privacy</a>
            <a href="terms.html">Terms</a>
          </span>
        </div>
      </div>
    </footer>
    <nav class="mobile-bottom-nav" aria-label="Mobile quick navigation">
      <a href="index.html">${icon("home", 19)}<span>Home</span></a>
      <a href="services.html">${icon("grid-3x3", 19)}<span>Services</span></a>
      <a href="products.html">${icon("shopping-bag", 19)}<span>Store</span></a>
      <a href="track-application.html">${icon("search", 19)}<span>Track</span></a>
      <a href="contact.html">${icon("message-circle", 19)}<span>Contact</span></a>
    </nav>
  `;
}

function setupMobileNav() {
  const toggle = document.querySelector("[data-mobile-toggle]");
  const menu = document.querySelector("#nav-menu");
  if (!toggle || !menu) return;

  toggle.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    document.body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
  });

  menu.querySelectorAll("[data-mobile-accordion]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = button.closest(".mobile-accordion");
      const isOpen = item?.classList.toggle("open") || false;
      button.setAttribute("aria-expanded", String(isOpen));
    });
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("open");
      document.body.classList.remove("nav-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setupDropdowns() {
  const items = [...document.querySelectorAll(".nav-item")];
  if (!items.length) return;

  const desktopQuery = window.matchMedia("(min-width: 1081px)");
  const closeTimers = new WeakMap();
  const closeDelay = 400;

  const clearCloseTimer = (item) => {
    const timer = closeTimers.get(item);
    if (timer) {
      clearTimeout(timer);
      closeTimers.delete(item);
    }
  };

  const setExpanded = (item, expanded) => {
    item.querySelector("[data-dropdown-trigger]")?.setAttribute("aria-expanded", String(expanded));
  };

  const closeItem = (item, delay = 0) => {
    clearCloseTimer(item);

    const finishClose = () => {
      item.classList.remove("open", "dropdown-open");
      setExpanded(item, false);
      closeTimers.delete(item);
    };

    if (delay > 0) {
      closeTimers.set(item, setTimeout(finishClose, delay));
      return;
    }

    finishClose();
  };

  const closeSiblings = (activeItem) => {
    items.forEach((item) => {
      if (item !== activeItem) closeItem(item);
    });
  };

  items.forEach((item) => {
    const trigger = item.querySelector("[data-dropdown-trigger]");

    const open = () => {
      closeSiblings(item);
      item.classList.add("dropdown-open");
      trigger?.setAttribute("aria-expanded", "true");
    };

    // Desktop: open on hover, NEVER close on pointerleave (close only on outside click)
    item.addEventListener("pointerenter", () => {
      if (desktopQuery.matches) open();
    });

    // focusin for keyboard nav
    item.addEventListener("focusin", open);

    // Mobile: toggle on trigger click / Touch navigation support
    trigger?.addEventListener("click", (event) => {
      const isMobile = window.matchMedia("(max-width: 1080px)").matches;
      const isTouchLike = window.matchMedia("(hover: none)").matches;
      if (!isMobile && !isTouchLike) return;

      const isOpen = item.classList.contains("dropdown-open") || item.classList.contains("open");
      if (!isOpen) {
        // If closed, prevent navigation and open it
        event.preventDefault();
        open();
        item.classList.add("open");
      } else {
        // If already open, let the click navigate naturally.
        // Also close the dropdown so it's not open if navigating to a hash link on the same page.
        setTimeout(() => closeItem(item), 150);
      }
    });

    // Close dropdown on clicking links inside it (e.g. for same-page hash scrolls or standard links)
    const dropdownContent = item.querySelector(".mega-menu, .submenu");
    if (dropdownContent) {
      dropdownContent.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (link) {
          // Mega sidebar links are handled by setupMegaMenuTabs so hover preview
          // and click navigation do not fight this generic dropdown closer.
          if (link.classList.contains("mega-sidebar-item")) {
            return;
          }

          try {
            // Check if it's a same-page hash link
            const currentUrl = new URL(window.location.href);
            const targetUrl = new URL(link.href, window.location.href);
            const isSamePageHash = currentUrl.origin === targetUrl.origin &&
                                   currentUrl.pathname === targetUrl.pathname &&
                                   targetUrl.hash !== "";

            if (isSamePageHash) {
              // Close after a short delay to allow the browser to register hash changes and scroll
              setTimeout(() => closeItem(item), 150);
            } else {
              // For different-page links, force navigation via window.location.href to prevent click cancellation
              event.preventDefault();
              if (link.getAttribute("target") === "_blank") {
                window.open(link.href, "_blank");
              } else {
                window.location.href = link.href;
              }
            }
          } catch (e) {
            // Fallback: force navigation to avoid failures
            event.preventDefault();
            const href = link.getAttribute("href") || link.href;
            if (link.getAttribute("target") === "_blank") {
              window.open(href, "_blank");
            } else {
              window.location.href = href;
            }
          }
        }
      });
    }
  });

  // Close ALL dropdowns when clicking ANYWHERE outside the nav
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-bar")) {
      items.forEach((item) => closeItem(item));
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    items.forEach((item) => {
      closeItem(item);
    });
  });
}

function setupHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;

  const update = () => header.classList.toggle("scrolled", window.scrollY > 8);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

function setupHeroWords() {
  const wordElements = document.querySelectorAll("[data-animated-word]");
  if (!wordElements.length) return;

  const defaultWords = [
    "Essential govt. & digital<br>services",
    "Student forms & college<br>applications",
    "Business setup & GST reg.<br>filings",
    "Utility payments & travel<br>bookings",
    "Custom prints & stickers<br>on demand",
    "Expert support & WhatsApp<br>tracking"
  ];

  wordElements.forEach((word) => {
    const customWords = (word.dataset.words || "")
      .split("|")
      .map((item) => item.trim())
      .filter(Boolean);
    const rawWords = customWords.length ? customWords : defaultWords;
    const words = rawWords.map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : "");
    // Use textContent for index matching (strip any existing HTML)
    let index = Math.max(0, words.findIndex(w => w.replace(/<br>/gi, ' ').trim().toLowerCase() === word.textContent.replace(/<br>/gi, ' ').trim().toLowerCase()));
    if (index === -1) index = 0;

    const swapWord = () => {
      index = (index + 1) % words.length;
      word.classList.remove("is-animating");
      void word.offsetWidth;
      word.innerHTML = words[index];  // Use innerHTML to support <br> tags
      word.classList.add("is-animating");
    };

    word.setAttribute("aria-live", "polite");
    word.innerHTML = words[index];  // Set initial word with HTML support
    word.classList.add("is-animating");
    if (words.length > 1) setInterval(swapWord, 1800);
  });
}

function serviceHeroProfile(serviceName = "") {
  const normalized = serviceName.toLowerCase();
  const profiles = [
    {
      test: /\bpan\b/,
      service: "PAN Card",
      shortName: "PAN",
      code: "PAN",
      icon: "id-card",
      progress: "69%",
      words: ["new PAN applications.", "PAN corrections.", "E-PAN downloads."]
    },
    {
      test: /student|edupoint|exam|admit|result|scholarship|university|resume|ccc|o level|photocopy|printing/i,
      service: "EduPoint",
      shortName: "Student",
      code: "EDU",
      icon: "graduation-cap",
      progress: "68%",
      words: ["exam form support.", "admit card downloads.", "result and resume help."]
    },
    {
      test: /gst/,
      service: "GST Registration",
      shortName: "GST",
      code: "GST",
      icon: "receipt-text",
      progress: "72%",
      words: ["GST registration.", "business KYC review.", "filing status support."]
    },
    {
      test: /msme|udyam/,
      service: "MSME Registration",
      shortName: "MSME",
      code: "MSM",
      icon: "factory",
      progress: "76%",
      words: ["MSME registration.", "Udyam certificates.", "small business proof."]
    },
    {
      test: /digital signature|dsc/,
      service: "Digital Signature",
      shortName: "DSC",
      code: "DSC",
      icon: "key-round",
      progress: "70%",
      words: ["digital signatures.", "Class 3 DSC support.", "KYC verification."]
    },
    {
      test: /fssai|food/,
      service: "FSSAI License",
      shortName: "FSSAI",
      code: "FSS",
      icon: "utensils",
      progress: "67%",
      words: ["FSSAI registration.", "food license filing.", "FoSCoS guidance."]
    },
    {
      test: /shop license|trade license|gumasta/,
      service: "Shop License",
      shortName: "Shop License",
      code: "SHP",
      icon: "store",
      progress: "66%",
      words: ["shop license support.", "trade registrations.", "local business proof."]
    },
    {
      test: /iec|import|export/,
      service: "IEC Code",
      shortName: "IEC",
      code: "IEC",
      icon: "ship",
      progress: "69%",
      words: ["IEC code applications.", "DGFT filing support.", "import export setup."]
    },
    {
      test: /trademark|brand|tm/,
      service: "Trademark Registration",
      shortName: "Trademark",
      code: "TM",
      icon: "badge-tm",
      progress: "64%",
      words: ["trademark filings.", "brand name search.", "class selection support."]
    },
    {
      test: /company|llp|opc|pvt/,
      service: "Company Registration",
      shortName: "Company",
      code: "COM",
      icon: "building-2",
      progress: "62%",
      words: ["company registration.", "LLP and OPC guidance.", "business setup planning."]
    },
    {
      test: /ayushman|pmjay/,
      service: "Ayushman Card",
      shortName: "Ayushman",
      code: "AYU",
      icon: "heart-pulse",
      progress: "68%",
      words: ["PMJAY eligibility checks.", "Ayushman e-card downloads.", "family record support."]
    },
    {
      test: /voter|epic/,
      service: "Voter ID",
      shortName: "Voter ID",
      code: "VOT",
      icon: "vote",
      progress: "68%",
      words: ["new voter registration.", "Voter ID corrections.", "e-EPIC downloads."]
    },
    {
      test: /passport/,
      service: "Passport Assistance",
      shortName: "Passport",
      code: "PAS",
      icon: "plane",
      progress: "64%",
      words: ["passport applications.", "renewal guidance.", "appointment support."]
    },
    {
      test: /birth/,
      service: "Birth Certificate",
      shortName: "Birth Certificate",
      code: "BIR",
      icon: "file-badge",
      progress: "68%",
      words: ["birth registration.", "certificate copies.", "delayed filing support."]
    },
    {
      test: /income/,
      service: "Income Certificate",
      shortName: "Income Certificate",
      code: "INC",
      icon: "file-check-2",
      progress: "68%",
      words: ["income certificates.", "scheme documents.", "status tracking."]
    },
    {
      test: /domicile|residence/,
      service: "Domicile Certificate",
      shortName: "Domicile",
      code: "DOM",
      icon: "home",
      progress: "68%",
      words: ["domicile certificates.", "residence proof.", "state quota documents."]
    },
    {
      test: /caste|jati/,
      service: "Caste Certificate",
      shortName: "Caste Certificate",
      code: "CAS",
      icon: "file-text",
      progress: "68%",
      words: ["caste certificates.", "category proof.", "revenue portal support."]
    },
    {
      test: /police|verification|character/,
      service: "Police Verification",
      shortName: "Police Verification",
      code: "POL",
      icon: "shield-check",
      progress: "64%",
      words: ["police verification.", "character certificates.", "tenant or job checks."]
    }
  ];

  const matched = profiles.find((profile) => profile.test.test(normalized));
  const result = matched
    ? { ...matched, words: [...matched.words] }
    : {
        service: serviceName || "E-Service",
        shortName: serviceName || "E-Service",
        code: slugify(serviceName || "service").slice(0, 3).toUpperCase() || "SRV",
        icon: "file-check-2",
        progress: "68%",
        words: [`${serviceName || "E-service"} requests.`, "document review.", "tracking support."]
      };
  result.words = result.words.map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : "");
  return result;
}

function setupServiceHeroDynamics() {
  const hero = document.querySelector(".premium-service-hero");
  const consolePanel = hero?.querySelector(".page-hero-console");
  if (!hero || !consolePanel) return;
  if (hero.classList.contains("services-hero")) return;

  const serviceName = defaultApplyServiceForPage()
    || document.querySelector(".page-hero-title")?.textContent?.replace(/\s+/g, " ").trim()
    || "E-Service";
  const profile = serviceHeroProfile(serviceName);

  const title = hero.querySelector(".page-hero-title");
  if (title && !title.querySelector("[data-animated-word]")) {
    const staticPart = document.createElement("span");
    staticPart.className = "service-title-static";
    staticPart.textContent = "One trusted place for ";

    const dynamicPart = document.createElement("span");
    dynamicPart.className = "animated-word service-animated-word";
    dynamicPart.dataset.animatedWord = "";
    dynamicPart.dataset.words = profile.words.join("|");
    dynamicPart.textContent = profile.words[0];

    title.textContent = "";
    title.append(staticPart, dynamicPart);
  }

  const topbarTitle = consolePanel.querySelector(".command-topbar strong");
  if (topbarTitle) topbarTitle.textContent = "One Point OS Live Dashboard";

  const trackerTag = consolePanel.querySelector(".command-main .tag");
  if (trackerTag) trackerTag.textContent = "Live tracker";

  const trackerId = consolePanel.querySelector(".command-main h3");
  if (trackerId) trackerId.textContent = `OPDS2026-${profile.code}`;

  const trackerText = consolePanel.querySelector(".command-main p");
  if (trackerText) {
    trackerText.textContent = `${profile.service} request is ready for operator review.`;
  }

  const progress = consolePanel.querySelector(".command-progress span");
  if (progress) progress.style.setProperty("--progress", profile.progress);

  const tiles = consolePanel.querySelectorAll(".command-tile");
  if (tiles[0]) {
    tiles[0].innerHTML = `${icon(profile.icon, 22)}<strong>Service</strong><small>Selected</small>`;
  }
  if (tiles[1]) {
    tiles[1].innerHTML = `${icon("lock-keyhole", 22)}<strong>Checkout</strong><small>Secured</small>`;
  }

  const list = consolePanel.querySelector(".command-list");
  if (list) {
    list.innerHTML = `
      <div><span>${icon("file-check-2", 20)}</span><strong>Document Checklist</strong><small class="status-complete">Ready</small></div>
      <div><span>${icon("credit-card", 20)}</span><strong>Payment Review</strong><small class="status-pending">After review</small></div>
      <div><span>${icon("search-check", 20)}</span><strong>Tracking Support</strong><small class="status-complete">Active</small></div>
    `;
  }

  const secureCard = consolePanel.querySelector(".hero-mini-card-one");
  const secureLabel = secureCard?.querySelector(".secure-flow-kicker");
  const secureText = secureCard?.querySelector("strong");
  if (secureLabel) secureLabel.textContent = "Secure Flow";
  if (secureText) secureText.textContent = "Consent + receipt + tracking";

  const supportCard = consolePanel.querySelector(".hero-mini-card-two");
  const supportLabel = supportCard?.querySelector(".helpdesk-kicker");
  const supportText = supportCard?.querySelector("strong");
  if (supportLabel) supportLabel.textContent = "Local Support";
  if (supportText) supportText.textContent = `${profile.shortName} helpdesk active`;
}

function setupTracker() {
  const form = document.querySelector("[data-tracker-form]");
  if (!form) return;

  const output = document.querySelector("[data-tracker-output]");
  const steps = [...document.querySelectorAll("[data-status-step]")];
  const input = form.querySelector('[name="applicationId"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const submitHtml = submitButton?.innerHTML || "Track";
  const defaultTimeline = steps.map((step) => ({
    label: step.dataset.statusStep || "",
    description: step.querySelector(".status-desc")?.textContent || ""
  }));
  let inputTimer = null;
  let activeController = null;

  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatMoney = (value, currency = "INR") => {
    try {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 0
      }).format(Number(value || 0));
    } catch {
      return `Rs. ${Number(value || 0).toFixed(0)}`;
    }
  };

  const badge = (state) => {
    if (state === "done") return '<span class="step-badge-done">Completed</span>';
    if (state === "active") return '<span class="step-badge-active">Current</span>';
    if (state === "attention") return '<span class="step-badge-alert">Attention</span>';
    return "";
  };

  const renderTimeline = (timeline = [], stageIndex = 0, isIssue = false) => {
    steps.forEach((step, index) => {
      const detail = timeline[index] || defaultTimeline[index] || {};
      const state = detail.state || (index < stageIndex ? "done" : (index === stageIndex ? "active" : "pending"));
      step.classList.toggle("done", !isIssue && state === "done");
      step.classList.toggle("active", !isIssue && state === "active");
      step.classList.toggle("attention", isIssue && (state === "attention" || index === stageIndex));

      const title = step.querySelector(".status-title");
      const desc = step.querySelector(".status-desc");
      if (title) title.innerHTML = `${escapeHtml(detail.label || step.dataset.statusStep || "")} ${badge(isIssue && index === stageIndex ? "attention" : state)}`;
      if (desc) {
        const time = formatDate(detail.time);
        desc.textContent = `${detail.description || defaultTimeline[index]?.description || ""}${time ? ` (${time})` : ""}`;
      }
    });
  };

  const renderMessage = (html, tone = "info") => {
    if (!output) return;
    output.closest(".tracker-output-wrapper")?.classList.toggle("is-error", tone === "error");
    output.closest(".tracker-output-wrapper")?.classList.toggle("is-success", tone === "success");
    output.innerHTML = html;
    if (window.lucide) window.lucide.createIcons();
  };

  const setLoading = (trackingNumber) => {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<i data-lucide="loader-2" class="spin" style="width: 16px; height: 16px;"></i> Checking';
    }
    renderMessage(`<strong>Checking ${escapeHtml(trackingNumber)}...</strong><br><small>Fetching live application status.</small>`);
  };

  const clearLoading = () => {
    if (!submitButton) return;
    submitButton.disabled = false;
    submitButton.innerHTML = submitHtml;
    if (window.lucide) window.lucide.createIcons();
  };

  const resetTracker = () => {
    renderTimeline([], 1, false);
    renderMessage("Enter your tracking number to see live application status.");
  };

  const apiBaseCandidates = (() => {
    if (window.location.protocol !== "file:") return [""];
    return [
      "http://localhost:4273",
      "http://127.0.0.1:4273",
      "http://localhost:4173",
      "http://127.0.0.1:4173"
    ];
  })();

  const fetchTrackerJson = async (path, options = {}) => {
    let lastNetworkError = null;
    for (const baseUrl of apiBaseCandidates) {
      try {
        const response = await fetch(`${baseUrl}${path}`, options);
        const data = await response.json().catch(() => ({}));
        return { response, data };
      } catch (error) {
        lastNetworkError = error;
      }
    }
    throw lastNetworkError || new Error("Live tracking server is not reachable.");
  };

  const recentContainer = document.createElement("div");
  recentContainer.className = "recent-tracking-container recent-track-list";
  form.parentNode.insertBefore(recentContainer, form.nextSibling);

  const renderRecentTrackingList = () => {
    let recent = [];
    try {
      recent = JSON.parse(localStorage.getItem("opds_recent_tracking") || "[]");
    } catch (e) { recent = []; }
    
    if (recent.length === 0) {
      recentContainer.innerHTML = "";
      recentContainer.style.display = "none";
      return;
    }
    
    recentContainer.style.display = "flex";
    recentContainer.innerHTML = `
      <span class="recent-track-label">Recent:</span>
      ${recent.map(id => `
        <button type="button" class="recent-track-chip" data-id="${id}">
          ${id}
        </button>
      `).join("")}
    `;
    
    recentContainer.querySelectorAll(".recent-track-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const id = chip.getAttribute("data-id");
        if (input) {
          input.value = id;
          trackApplication(id);
        }
      });
      chip.style.transition = "all 0.25s ease";
      chip.addEventListener("mouseenter", () => {
        chip.style.background = "rgba(18, 86, 150, 0.12)";
        chip.style.borderColor = "var(--brand-blue-royal)";
      });
      chip.addEventListener("mouseleave", () => {
        chip.style.background = "rgba(18, 86, 150, 0.05)";
        chip.style.borderColor = "rgba(18, 86, 150, 0.12)";
      });
    });
  };

  const renderTrackingResult = (data) => {
    const order = data.order || {};
    const application = data.application || {};
    const payment = data.payment || {};
    const documents = data.documents || {};
    const primaryItem = (data.items || [])[0];
    const serviceName = primaryItem?.name || "Application";
    const total = order.total ? ` · ${formatMoney(order.total, order.currency || "INR")}` : "";
    const created = formatDate(order.createdAt);
    const missing = Array.isArray(documents.missing) && documents.missing.length
      ? `<br><small>Missing: ${documents.missing.map(escapeHtml).join(", ")}</small>`
      : "";
    const invoice = data.invoice?.downloadUrl
      ? `<a class="tracker-inline-link" href="${escapeHtml(data.invoice.downloadUrl)}">Download invoice</a>`
      : "";

    renderTimeline(data.timeline || [], Number(application.stageIndex || 0), Boolean(application.isIssue));
    renderMessage(`
      <div class="tracker-result-line">
        <strong>${escapeHtml(order.orderId || data.trackingNumber)} - ${escapeHtml(application.displayStatus || order.statusLabel || "Pending")}</strong>
        ${invoice}
      </div>
      <small>${escapeHtml(serviceName)}${total}${created ? ` · Created ${escapeHtml(created)}` : ""}</small>
      <br><span>${escapeHtml(application.summary || "Live status loaded.")}</span>
      <br><small>Payment: ${escapeHtml(payment.statusLabel || "Pending")} · Documents uploaded: ${Number(documents.uploadedCount || 0)}</small>
      ${missing}
      <br><small>${escapeHtml(application.nextAction || "")}</small>
    `, application.isIssue ? "error" : (Number(application.stageIndex || 0) >= 3 ? "success" : "info"));

    if (order.orderId) {
      let recent = [];
      try {
        recent = JSON.parse(localStorage.getItem("opds_recent_tracking") || "[]");
      } catch (e) { recent = []; }
      recent = recent.filter(id => id !== order.orderId);
      recent.unshift(order.orderId);
      recent = recent.slice(0, 3);
      localStorage.setItem("opds_recent_tracking", JSON.stringify(recent));
      renderRecentTrackingList();

      if (typeof window._trackShowDocumentUpload === "function") {
        window._trackShowDocumentUpload(order.orderId);
      }
    }
  };

  const trackApplication = async (trackingNumber, options = {}) => {
    const clean = String(trackingNumber || "").trim();
    if (!clean) {
      resetTracker();
      return;
    }

    if (window.trackAnalyticsEvent) {
      window.trackAnalyticsEvent('tracking_search', {
        trackingNumber: clean,
        silent: !!options.silent
      });
    }

    if (activeController) activeController.abort();
    activeController = new AbortController();
    if (!options.silent) setLoading(clean);

    try {
      const { response, data } = await fetchTrackerJson(`/api/applications/track/${encodeURIComponent(clean)}`, {
        signal: activeController.signal
      });
      if (!response.ok) throw new Error(data.message || "Tracking number not found.");
      renderTrackingResult(data);
    } catch (error) {
      if (error.name === "AbortError") return;
      renderTimeline([], 0, true);
      const isNetworkError = /failed to fetch|network|not reachable/i.test(error.message || "");
      const title = isNetworkError ? "Live server not reachable" : "Status not found";
      const detail = isNetworkError && window.location.protocol === "file:"
        ? "Start the local backend server, or open this page from http://localhost:4273/track-application.html."
        : (error.message || "Please check the tracking number and try again.");
      renderMessage(`<strong>${escapeHtml(title)}</strong><br><small>${escapeHtml(detail)}</small>`, "error");
    } finally {
      clearLoading();
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.clearTimeout(inputTimer);
    trackApplication(new FormData(form).get("applicationId"));
  });

  input?.addEventListener("input", () => {
    window.clearTimeout(inputTimer);
    const value = input.value.trim();
    if (!value) {
      resetTracker();
      return;
    }
    if (value.length < 4) return;
    inputTimer = window.setTimeout(() => trackApplication(value, { silent: true }), 450);
  });

  renderRecentTrackingList();

  const params = new URLSearchParams(window.location.search);
  const initialTrackingNumber = params.get("id") || params.get("order") || params.get("tracking") || params.get("order_id") || "";
  if (initialTrackingNumber && input) {
    input.value = initialTrackingNumber;
    trackApplication(initialTrackingNumber, { silent: false });
  } else {
    resetTracker();
  }
}

function setupFaqs() {
  const faqContainers = document.querySelectorAll(".faq");
  faqContainers.forEach(container => {
    if (container.dataset.faqsBound) return;
    container.dataset.faqsBound = "true";
    container.addEventListener("click", (e) => {
      const button = e.target.closest("[data-faq-question]");
      if (!button) return;
      const item = button.closest(".faq-item");
      if (item) {
        item.classList.toggle("open");
      }
    });
  });

  // Fallback for elements outside a .faq container
  document.querySelectorAll("[data-faq-question]").forEach((button) => {
    const item = button.closest(".faq-item");
    if (item && !item.parentElement.classList.contains("faq")) {
      button.addEventListener("click", () => {
        item.classList.toggle("open");
      });
    }
  });
}

function setupSearch() {
  const input = document.querySelector("[data-ai-search]");
  const suggestions = document.querySelector("[data-ai-suggestions]");
  if (!input || !suggestions) return;

  let activeIndex = -1;

  // Render matches on user input
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    activeIndex = -1;
    if (!query) {
      suggestions.classList.remove("show");
      suggestions.innerHTML = "";
      return;
    }

    const matches = searchIndex.filter((item) => `${item.term} ${item.title}`.toLowerCase().includes(query)).slice(0, 5);
    suggestions.innerHTML = matches.length
      ? matches.map((item, idx) => `<a href="${item.href}" data-suggestion-idx="${idx}">${item.title}<br><small>${item.term}</small></a>`).join("")
      : `<a href="support.html">Talk to support for "${query}"</a>`;
    suggestions.classList.add("show");
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });

  // Show suggestions on focus if query exists
  input.addEventListener("focus", () => {
    if (input.value.trim()) {
      suggestions.classList.add("show");
    }
  });

  // Keyboard navigation support
  input.addEventListener("keydown", (e) => {
    const links = suggestions.querySelectorAll("a");
    if (!links.length || !suggestions.classList.contains("show")) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % links.length;
      updateActiveSuggestion(links);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + links.length) % links.length;
      updateActiveSuggestion(links);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < links.length) {
        e.preventDefault();
        links[activeIndex].click();
      } else {
        const firstLink = links[0];
        if (firstLink) {
          e.preventDefault();
          firstLink.click();
        }
      }
    } else if (e.key === "Escape") {
      suggestions.classList.remove("show");
      input.blur();
    }
  });

  function updateActiveSuggestion(links) {
    links.forEach((link, idx) => {
      if (idx === activeIndex) {
        link.classList.add("active");
        link.scrollIntoView({ block: "nearest" });
      } else {
        link.classList.remove("active");
      }
    });
  }

  // Close suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.classList.remove("show");
    }
  });
}

function setupServiceCtas() {
  document.querySelectorAll('a[href^="contact.html?service="]').forEach((link) => {
    const href = link.getAttribute("href") || "";
    const target = new URL(href, window.location.href);
    const service = target.searchParams.get("service");
    if (!service) return;
    link.href = serviceApplyHref(service, target.searchParams.get("category") || "general");
  });

  document.querySelectorAll('a[href="contact.html"]').forEach((link) => {
    const card = link.closest(".service-card, .mini-card, .panel, .product-card");
    const title = card?.querySelector("h1, h2, h3")?.textContent?.trim();
    if (title) {
      const category = getCurrentPage().replace(".html", "").replace(/-/g, " ");
      link.href = contactHref(title, category);
    } else {
      const current = getCurrentPage();
      if (current && current !== "contact.html") {
        link.href = `contact.html?from=${current}`;
      }
    }
  });
}

function setupProductCarousel() {
  document.querySelectorAll("[data-product-carousel]").forEach((wrap) => {
    const track = wrap.querySelector(".product-carousel");
    const prev = wrap.querySelector(".carousel-prev");
    const next = wrap.querySelector(".carousel-next");
    if (!track) return;

    const cardWidth = () => track.querySelector(".product-card")?.getBoundingClientRect().width || 280;
    const scrollAmount = () => cardWidth() + 18;
    const scrollNext = () => {
      const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 12;
      track.scrollTo({ left: nearEnd ? 0 : track.scrollLeft + scrollAmount(), behavior: "smooth" });
    };
    const scrollPrev = () => {
      const nearStart = track.scrollLeft <= 12;
      track.scrollTo({ left: nearStart ? track.scrollWidth : track.scrollLeft - scrollAmount(), behavior: "smooth" });
    };

    next?.addEventListener("click", scrollNext);
    prev?.addEventListener("click", scrollPrev);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let paused = false;
    wrap.addEventListener("pointerenter", () => { paused = true; });
    wrap.addEventListener("pointerleave", () => { paused = false; });
    wrap.addEventListener("focusin", () => { paused = true; });
    wrap.addEventListener("focusout", () => { paused = false; });

    setInterval(() => {
      if (!paused && document.visibilityState === "visible") scrollNext();
    }, 3400);
  });
}

function scrollToPageTarget(target, behavior = "smooth") {
  if (!target) return;
  const header = document.querySelector(".site-header");
  const headerHeight = header ? header.getBoundingClientRect().height : 0;
  const targetTop = target.getBoundingClientRect().top + window.scrollY - headerHeight - 16;
  window.scrollTo({
    top: Math.max(0, targetTop),
    behavior
  });
}

function setupDeferredHashTargeting() {
  const scrollToCurrentHash = (behavior = "auto") => {
    const hash = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
    if (!hash) return;
    const target = document.getElementById(hash);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    scrollToPageTarget(target, behavior);
  };

  [80, 420, 1000].forEach((delay, index) => {
    window.setTimeout(() => scrollToCurrentHash(index === 0 ? "auto" : "smooth"), delay);
  });

  window.addEventListener("hashchange", () => {
    window.setTimeout(() => scrollToCurrentHash("smooth"), 50);
  });
}

function setupEduPointServiceCarousel() {
  const root = document.querySelector("[data-edupoint-service-carousel]");
  if (!root) return;

  const track = root.querySelector("[data-edupoint-service-track]");
  const cards = [...root.querySelectorAll("[data-edupoint-service-card]")];
  const prev = root.querySelector("[data-edupoint-carousel-prev]");
  const next = root.querySelector("[data-edupoint-carousel-next]");
  const activeLabel = root.querySelector("[data-edupoint-active-service]");
  const filterButtons = [...root.querySelectorAll("[data-edupoint-filter]")];
  const viewAllButton = root.querySelector("[data-edupoint-view-all]");
  if (!track || cards.length < 2) return;

  const params = new URLSearchParams(window.location.search);
  const requestedService = (params.get("service_name") || params.get("service") || "").trim();
  const requestedHash = decodeURIComponent((window.location.hash || "").replace(/^#/, ""));
  const normalizeService = (value = "") => value.trim().toLowerCase().replace(/\s+/g, " ");
  const serviceNamesForCard = (card) => {
    const names = [
      card.dataset.service,
      card.querySelector(".btn-service-select")?.dataset.service,
      card.querySelector("h3")?.textContent
    ];
    const href = card.getAttribute("href") || card.querySelector("a[href]")?.getAttribute("href") || "";
    if (href) {
      try {
        const url = new URL(href, window.location.href);
        names.push(url.searchParams.get("service"), url.searchParams.get("service_name"));
      } catch (error) {
        // Ignore malformed local hrefs; visible card text still provides the service name.
      }
    }
    return names.map((name) => normalizeService(name || "")).filter(Boolean);
  };
  const requestedServiceIndex = requestedService
    ? cards.findIndex((card) => serviceNamesForCard(card).includes(normalizeService(requestedService)))
    : -1;
  const requestedHashIndex = requestedHash
    ? cards.findIndex((card) => card.id === requestedHash)
    : -1;
  let activeIndex = requestedServiceIndex >= 0
    ? requestedServiceIndex
    : (requestedHashIndex >= 0 ? requestedHashIndex : 0);
  let paused = requestedServiceIndex >= 0 || requestedHashIndex >= 0;
  let timer = null;
  let currentFilter = "all";
  let expanded = false;

  const cardServiceName = (card) => card.querySelector(".btn-service-select")?.dataset.service || card.querySelector("h3")?.textContent?.trim() || "EduPoint service";
  const cardCategories = (card) => (card.dataset.edupointCategories || "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
  const cardMatchesFilter = (card) => currentFilter === "all" || cardCategories(card).includes(currentFilter);
  const filteredCards = () => cards.filter(cardMatchesFilter);
  const visibleCount = () => {
    if (window.matchMedia("(max-width: 560px)").matches) return 1;
    if (window.matchMedia("(max-width: 820px)").matches) return 2;
    return 4;
  };

  const visibleStartForIndex = (index, count) => index;
  const updateFilterButtons = () => {
    filterButtons.forEach((button) => {
      const active = (button.dataset.edupointFilter || "all") === currentFilter;
      button.classList.toggle("active", active);
      button.classList.toggle("btn-soft", active);
      button.classList.toggle("btn-ghost", !active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  };
  const updateViewAllButton = () => {
    if (!viewAllButton) return;
    viewAllButton.setAttribute("aria-expanded", expanded ? "true" : "false");
    const label = viewAllButton.querySelector("span");
    if (label) label.textContent = expanded ? "Carousel" : "View All";
  };

  const activate = (index) => {
    const matches = filteredCards();
    if (!matches.length) return;
    let activeCard = cards[(index + cards.length) % cards.length];
    if (!activeCard || !cardMatchesFilter(activeCard)) activeCard = matches[0];
    activeIndex = cards.indexOf(activeCard);
    const activeFilteredIndex = Math.max(0, matches.indexOf(activeCard));
    const count = visibleCount();
    const visibleStart = expanded ? 0 : visibleStartForIndex(activeFilteredIndex, count);
    const visibleLimit = Math.min(count, matches.length);
    root.classList.toggle("is-expanded", expanded);
    cards.forEach((card, cardIndex) => {
      const filteredIndex = matches.indexOf(card);
      const inFilter = filteredIndex >= 0;
      const carouselOffset = inFilter ? (filteredIndex - visibleStart + matches.length) % matches.length : -1;
      const visible = expanded
        ? inFilter
        : (inFilter && carouselOffset >= 0 && carouselOffset < visibleLimit);
      card.classList.toggle("is-visible", visible);
      card.classList.toggle("is-active", cardIndex === activeIndex);
      card.classList.toggle("is-filtered-out", !inFilter);
      card.setAttribute("aria-current", cardIndex === activeIndex ? "true" : "false");
      card.style.order = visible ? String(expanded ? filteredIndex : carouselOffset) : "";
    });
    if (activeLabel) activeLabel.textContent = cardServiceName(cards[activeIndex]);
    updateFilterButtons();
    updateViewAllButton();
  };

  const step = (direction = 1) => {
    const matches = filteredCards();
    if (!matches.length) return;
    const currentCard = cards[activeIndex];
    const currentPosition = Math.max(0, matches.indexOf(currentCard));
    const nextPosition = (currentPosition + direction + matches.length) % matches.length;
    activate(cards.indexOf(matches[nextPosition]));
  };
  const restart = () => {
    if (timer) window.clearInterval(timer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = window.setInterval(() => {
      if (!paused && !expanded && document.visibilityState === "visible") step(1);
    }, 2600);
  };
  const collapseToCarousel = () => {
    if (!expanded) return;
    expanded = false;
    paused = false;
    activate(activeIndex);
    restart();
  };

  prev?.addEventListener("click", () => {
    expanded = false;
    paused = false;
    step(-1);
    restart();
  });
  next?.addEventListener("click", () => {
    expanded = false;
    paused = false;
    step(1);
    restart();
  });
  root.addEventListener("pointerenter", () => { paused = true; });
  root.addEventListener("pointerleave", () => { if (!expanded) paused = false; });
  root.addEventListener("focusin", () => { paused = true; });
  root.addEventListener("focusout", () => { if (!expanded) paused = false; });
  root.addEventListener("click", (event) => {
    const card = event.target.closest("[data-edupoint-service-card]");
    if (!card) return;
    const index = cards.indexOf(card);
    if (index >= 0) {
      paused = false;
      activate(index);
      restart();
    }
  });
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.edupointFilter || "all";
      expanded = false;
      paused = false;
      const firstMatch = filteredCards()[0] || cards[0];
      activate(cards.indexOf(firstMatch));
      restart();
    });
  });
  viewAllButton?.addEventListener("click", () => {
    expanded = !expanded;
    currentFilter = "all";
    paused = expanded;
    activate(activeIndex);
    if (expanded) {
      window.setTimeout(() => scrollToPageTarget(root, "smooth"), 80);
    } else {
      restart();
    }
  });
  window.addEventListener("resize", () => activate(activeIndex), { passive: true });
  if ("IntersectionObserver" in window) {
    const collapseObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) collapseToCarousel();
      });
    }, { threshold: 0.04 });
    collapseObserver.observe(root);
  }

  activate(activeIndex);
  if (requestedHashIndex >= 0) {
    [120, 700, 1400].forEach((delay, index) => {
      window.setTimeout(() => {
        scrollToPageTarget(document.getElementById("service-options"), index === 0 ? "auto" : "smooth");
      }, delay);
    });
  }
  restart();
}

function productPriceLabel(product) {
  return `Rs. ${product.price}`;
}

function productWhatsAppHref(product) {
  const message = `Hi One Point, I want to order ${product.name} from OneMart.`;
  return `${siteConfig.whatsapp}?text=${encodeURIComponent(message)}`;
}

function productCard(product) {
  return `
    <article class="store-product-card" data-product-card="${product.slug}">
      <a class="store-product-link" href="${product.href}" aria-label="Open ${product.name} product page">
        <div class="store-product-media">
          <img data-rotating-product="${product.slug}" src="${product.images[0]}" alt="${product.name}" loading="lazy" decoding="async">
          <span class="store-product-badge">${product.badge}</span>
          <span class="store-product-rating">${icon("star", 13)} ${product.rating}</span>
        </div>
        <div class="store-product-body">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
        </div>
      </a>
      <div class="store-product-actions">
        <div class="store-product-price">
          <span>Starting at</span>
          <strong>${productPriceLabel(product)}</strong>
        </div>
        <button class="btn btn-soft" type="button" data-add-to-cart="${product.slug}">${icon("shopping-cart", 16)} Add to Cart</button>
        <a class="btn btn-primary" href="${product.href}">${icon("credit-card", 16)} Buy Now</a>
      </div>
    </article>
  `;
}

function renderOneMartCatalog() {
  const root = document.querySelector("[data-onemart-catalog]");
  if (!root) return;

  root.innerHTML = `
    <div class="section-head">
      <div>
        <p class="section-kicker">Full OneMart Catalog</p>
        <h2>All products, cleanly grouped by category.</h2>
      </div>
      <button class="btn btn-soft" type="button" data-cart-button>${icon("shopping-cart", 18)} Cart <span data-cart-count>0</span></button>
    </div>
    <div class="store-category-stack">
      ${oneMartGroups.map((group) => {
        const products = oneMartProducts.filter((product) => product.category === group.title);
        return `
          <section class="store-category-section" id="${group.anchor || slugify(group.title)}">
            <div class="store-category-head">
              <span>${icon(group.icon, 24)}</span>
              <div>
                <p class="section-kicker">${group.badge || "OneMart"}</p>
                <h2>${group.title}</h2>
                <p>${categoryDescriptions[group.title]}</p>
              </div>
              <div class="store-carousel-controls">
                <button class="icon-button" type="button" aria-label="Previous ${group.title}" data-carousel-prev="${group.anchor || slugify(group.title)}">${icon("chevron-left", 18)}</button>
                <button class="icon-button" type="button" aria-label="Next ${group.title}" data-carousel-next="${group.anchor || slugify(group.title)}">${icon("chevron-right", 18)}</button>
              </div>
            </div>
            <div class="store-product-rail" data-store-rail="${group.anchor || slugify(group.title)}">
              ${products.map(productCard).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </div>
  `;
}

function renderProductDetail() {
  const root = document.querySelector("[data-product-detail]");
  if (!root) return;

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("product") || root.dataset.productSlug || oneMartProducts[0]?.slug;
  const product = productBySlug(slug);
  if (!product) {
    root.innerHTML = `
      <section class="section">
        <div class="panel">
          <p class="section-kicker">OneMart</p>
          <h1>Product not found.</h1>
          <p>This product link is unavailable. Open OneMart to browse active products.</p>
          <a class="btn btn-primary" href="products.html">Back to OneMart</a>
        </div>
      </section>
    `;
    return;
  }

  document.title = `${product.name} | OneMart`;
  const related = oneMartProducts
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 5);

  root.innerHTML = `
    <section class="section product-detail-hero">
      <div class="product-detail-layout">
        <div class="product-gallery">
          <div class="product-gallery-main">
            <img data-product-main-image data-rotating-product="${product.slug}" src="${product.images[0]}" alt="${product.name}" decoding="async">
            <span>${product.badge}</span>
          </div>
          <div class="product-thumbs" aria-label="${product.name} image gallery">
            ${product.images.map((image, index) => `
              <button class="${index === 0 ? "active" : ""}" type="button" data-product-thumb="${image}" aria-label="Show image ${index + 1}">
                <img src="${image}" alt="${product.name} thumbnail ${index + 1}" loading="lazy" decoding="async">
              </button>
            `).join("")}
          </div>
        </div>
        <article class="product-buy-panel">
          <p class="section-kicker">OneMart / ${product.category}</p>
          <h1>${product.name}</h1>
          <div class="product-rating-row">
            <strong>${product.rating} rating</strong>
            <span>In stock</span>
          </div>
          <p>${product.description} ${product.short}</p>
          <div class="product-price-row">
            <strong>${productPriceLabel(product)}</strong>
            <em>Final quote may change by size and quantity.</em>
          </div>
          <div class="product-variations" aria-label="Product variations">
            <h2>Variations</h2>
            <div>${product.variations.map((item) => `<button type="button">${item}</button>`).join("")}</div>
          </div>
          <div class="product-quantity">
            <span>Qty</span>
            <button type="button" data-qty-minus>-</button>
            <input value="1" inputmode="numeric" aria-label="Quantity" data-product-qty>
            <button type="button" data-qty-plus>+</button>
          </div>
          <div class="product-buy-actions">
            <button class="btn btn-soft" type="button" data-add-to-cart="${product.slug}">${icon("shopping-cart", 18)} Add to Cart</button>
            <a class="btn btn-primary" href="checkout.html?product=${product.slug}&qty=1">${icon("credit-card", 18)} Buy Now</a>
          </div>
          <a class="btn btn-ghost" href="products.html#${product.categorySlug}">Back to OneMart</a>
          <div class="product-service-strip" aria-label="OneMart order support">
            <span>${icon("badge-check", 18)} Proof before final print</span>
            <span>${icon("message-circle", 18)} WhatsApp confirmation</span>
            <span>${icon("package-check", 18)} Pickup or delivery help</span>
          </div>
        </article>
      </div>
    </section>
    <section class="section section-tight">
      <div class="product-info-grid">
        <article class="mini-card">
          <span class="feature-icon">${icon("badge-check", 22)}</span>
          <h3>Print-ready proofing</h3>
          <p>Artwork, size and quantity are checked before final printing starts.</p>
        </article>
        <article class="mini-card">
          <span class="feature-icon">${icon("truck", 22)}</span>
          <h3>Pickup or delivery</h3>
          <p>Local pickup is available, and delivery can be discussed on WhatsApp.</p>
        </article>
        <article class="mini-card">
          <span class="feature-icon">${icon("repeat", 22)}</span>
          <h3>Bulk orders</h3>
          <p>Repeat and bulk business orders can be quoted separately.</p>
        </article>
      </div>
    </section>
    ${related.length ? `
      <section class="section section-tight">
        <div class="section-head">
          <div><p class="section-kicker">Related</p><h2>More from ${product.category}.</h2></div>
        </div>
        <div class="store-product-rail related-rail">
          ${related.map(productCard).join("")}
        </div>
      </section>
    ` : ""}
  `;
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("oneMartCart") || "[]");
  } catch {
    return [];
  }
}

function setCart(cart) {
  localStorage.setItem("oneMartCart", JSON.stringify(cart));
  updateCartCount();
}

function addProductToCart(slug, quantity = 1) {
  const product = productBySlug(slug);
  if (!product) return;
  const cart = getCart();
  const existing = cart.find((item) => item.slug === slug);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ slug, quantity });
  }
  setCart(cart);
  showCartToast(`${product.name} added to cart`);
}

function updateCartCount() {
  const count = getCart().reduce((total, item) => total + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((node) => {
    node.textContent = String(count);
    node.style.display = count ? "inline-flex" : "none";
  });
}

function renderCartDrawer() {
  if (document.querySelector("[data-cart-drawer]")) return;
  const drawer = document.createElement("div");
  drawer.className = "cart-drawer-shell";
  drawer.setAttribute("data-cart-drawer", "");
  drawer.innerHTML = `
    <div class="cart-backdrop" data-cart-close></div>
    <aside class="cart-drawer" aria-label="OneMart cart">
      <div class="cart-drawer-head">
        <div>
          <p class="section-kicker">OneMart</p>
          <h2>Your Cart</h2>
        </div>
        <button class="icon-button" type="button" data-cart-close aria-label="Close cart">${icon("x", 18)}</button>
      </div>
      <div class="cart-items" data-cart-items></div>
      <div class="cart-total">
        <span>Estimated total</span>
        <strong data-cart-total>Rs. 0</strong>
      </div>
      <a class="btn btn-primary" href="checkout.html" data-cart-checkout>${icon("credit-card", 18)} Checkout</a>
    </aside>
  `;
  document.body.appendChild(drawer);
}

function refreshCartDrawer() {
  renderCartDrawer();
  const cart = getCart();
  const itemsRoot = document.querySelector("[data-cart-items]");
  const totalRoot = document.querySelector("[data-cart-total]");
  const checkout = document.querySelector("[data-cart-checkout]");
  if (!itemsRoot || !totalRoot || !checkout) return;

  const enriched = cart
    .map((item) => ({ ...item, product: productBySlug(item.slug) }))
    .filter((item) => item.product);
  const total = enriched.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  itemsRoot.innerHTML = enriched.length
    ? enriched.map((item) => `
      <div class="cart-item">
        <img src="${item.product.images[0]}" alt="${item.product.name}" loading="lazy" decoding="async">
        <div>
          <strong>${item.product.name}</strong>
          <span>${productPriceLabel(item.product)} x ${item.quantity}</span>
        </div>
        <button type="button" data-remove-cart="${item.product.slug}" aria-label="Remove ${item.product.name}">${icon("trash-2", 16)}</button>
      </div>
    `).join("")
    : `<p class="cart-empty">Cart is empty. Add products from OneMart.</p>`;

  totalRoot.textContent = `Rs. ${total}`;
  checkout.href = "checkout.html";
  if (window.lucide) window.lucide.createIcons();
}

function showCartDrawer() {
  refreshCartDrawer();
  document.querySelector("[data-cart-drawer]")?.classList.add("open");
}

function hideCartDrawer() {
  document.querySelector("[data-cart-drawer]")?.classList.remove("open");
}

function showCartToast(message) {
  let toast = document.querySelector("[data-cart-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "cart-toast";
    toast.setAttribute("data-cart-toast", "");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showCartToast.timer);
  showCartToast.timer = setTimeout(() => toast.classList.remove("show"), 1800);
}

function setupOneMartInteractions() {
  renderCartDrawer();
  updateCartCount();

  const rotators = [...document.querySelectorAll("[data-rotating-product]")].map((img) => {
    const product = productBySlug(img.dataset.rotatingProduct);
    return product ? { img, product, index: 0 } : null;
  }).filter(Boolean);

  if (rotators.length && !setupOneMartInteractions.rotatorStarted) {
    setupOneMartInteractions.rotatorStarted = true;
    setInterval(() => {
      document.querySelectorAll("[data-rotating-product]").forEach((img) => {
        const product = productBySlug(img.dataset.rotatingProduct);
        if (!product) return;
        const next = (Number(img.dataset.imageIndex || "0") + 1) % product.images.length;
        img.dataset.imageIndex = String(next);
        img.src = product.images[next];
      });
    }, 3200);
  }

  document.querySelectorAll("[data-store-rail]").forEach((rail) => {
    const id = rail.dataset.storeRail;
    const prev = document.querySelector(`[data-carousel-prev="${id}"]`);
    const next = document.querySelector(`[data-carousel-next="${id}"]`);
    const amount = () => (rail.querySelector(".store-product-card")?.getBoundingClientRect().width || 280) + 18;
    prev?.addEventListener("click", () => rail.scrollBy({ left: -amount(), behavior: "smooth" }));
    next?.addEventListener("click", () => rail.scrollBy({ left: amount(), behavior: "smooth" }));
  });

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-to-cart]");
    if (add) {
      event.preventDefault();
      const quantity = Number(document.querySelector("[data-product-qty]")?.value || "1") || 1;
      addProductToCart(add.dataset.addToCart, quantity);
      return;
    }

    if (event.target.closest("[data-cart-button]")) {
      event.preventDefault();
      showCartDrawer();
      return;
    }

    if (event.target.closest("[data-cart-close]")) {
      event.preventDefault();
      hideCartDrawer();
      return;
    }

    const remove = event.target.closest("[data-remove-cart]");
    if (remove) {
      event.preventDefault();
      setCart(getCart().filter((item) => item.slug !== remove.dataset.removeCart));
      refreshCartDrawer();
    }
  });

  document.querySelectorAll("[data-product-thumb]").forEach((button) => {
    button.addEventListener("click", () => {
      const img = document.querySelector("[data-product-main-image]");
      if (img) img.src = button.dataset.productThumb;
      document.querySelectorAll("[data-product-thumb]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelector("[data-qty-minus]")?.addEventListener("click", () => {
    const input = document.querySelector("[data-product-qty]");
    if (!input) return;
    input.value = String(Math.max(1, Number(input.value || "1") - 1));
  });

  document.querySelector("[data-qty-plus]")?.addEventListener("click", () => {
    const input = document.querySelector("[data-product-qty]");
    if (!input) return;
    input.value = String(Math.min(99, Number(input.value || "1") + 1));
  });
}

function setupImageLoading() {
  document.querySelectorAll("img").forEach((img, index) => {
    if (!img.hasAttribute("loading") && index > 1) img.loading = "lazy";
    if (!img.hasAttribute("decoding")) img.decoding = "async";
  });
}

function setupGallery() {
  const main = document.querySelector("[data-gallery-main]");
  if (!main) return;

  document.querySelectorAll("[data-thumb]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-thumb]").forEach((thumb) => thumb.classList.remove("active"));
      button.classList.add("active");
      main.src = button.dataset.thumb;
    });
  });
}

function setupTabs() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab-target]");
    if (!button) return;

    document.querySelectorAll("[data-tab-target]").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll("[data-tab-panel]").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(button.dataset.tabTarget)?.classList.add("active");
  });
}

function setupRequiredDocumentsTabs() {
  document.querySelectorAll("[data-pan-doc-tabs]").forEach((root) => {
    const tabs = [...root.querySelectorAll("[data-pan-doc-tab]")];
    const panels = [...root.querySelectorAll("[data-pan-doc-panel]")];
    const image = root.querySelector("[data-pan-doc-image]");
    const imageTitle = root.querySelector("[data-pan-doc-image-title]");
    const imageLabel = root.querySelector("[data-pan-doc-image-label]");

    if (!tabs.length || !panels.length) return;

    const activateTab = (activeTab) => {
      const target = activeTab.dataset.panDocTab;

      tabs.forEach((tab) => {
        const isActive = tab === activeTab;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      panels.forEach((panel) => {
        panel.classList.toggle("active", panel.dataset.panDocPanel === target);
      });

      if (image && activeTab.dataset.image) {
        image.src = activeTab.dataset.image;
        image.alt = `${activeTab.dataset.imageTitle || activeTab.textContent.trim()} document preview`;
      }

      if (imageTitle) {
        imageTitle.textContent = activeTab.dataset.imageTitle || activeTab.textContent.trim();
      }

      if (imageLabel) {
        imageLabel.textContent = activeTab.dataset.imageLabel || "Document checklist";
      }
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => activateTab(tab));
      tab.addEventListener("keydown", (event) => {
        if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;

        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % tabs.length;
        if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;

        tabs[nextIndex].focus();
        activateTab(tabs[nextIndex]);
      });
    });

    activateTab(tabs.find((tab) => tab.classList.contains("active")) || tabs[0]);
  });
}

function setupReveal() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length) return;

  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14 });

  items.forEach((item) => observer.observe(item));
}

function setupActiveMobileNav() {
  const current = getCurrentPage();
  document.querySelectorAll(".mobile-bottom-nav a").forEach((link) => {
    if (link.getAttribute("href") === current) {
      link.classList.add("active");
    }
  });
}

function setupContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const select = form.querySelector("[data-service-select]");
  const formGrid = form.querySelector("[data-form-grid]");
  const formSuccess = form.querySelector("[data-form-success]");
  const formResetBtn = form.querySelector("[data-form-reset]");
  const otherServiceWrapper = form.querySelector("[data-other-service-wrapper]");
  const formTitle = document.querySelector("[data-contact-title]");
  const formSummary = document.querySelector("[data-contact-summary]");
  const successMessage = form.querySelector("[data-contact-success-message]");
  const serviceGuidance = form.querySelector("[data-service-guidance]");
  const attachmentTitle = form.querySelector("[data-attachment-title]");
  const attachmentSummary = form.querySelector("[data-attachment-summary]");
  const paymentNote = form.querySelector("[data-payment-note]");
  const safeNote = form.querySelector("[data-safe-note]");
  const requestTime = form.querySelector("[data-request-time]");
  const requestMode = form.querySelector("[data-request-mode]");
  const notesField = form.querySelector("#contact-documents");
  const trustTitle = form.querySelector("[data-trust-title]");
  const trustDesc = form.querySelector("[data-trust-desc]");
  const trustBullets = form.querySelector("[data-trust-bullets]");
  const trustIconBox = form.querySelector("[data-trust-icon-container]");
  if (!select || !otherServiceWrapper) return;
  const otherServiceInput = otherServiceWrapper.querySelector("input");

  const urlParams = new URLSearchParams(window.location.search);
  const preselectedService = urlParams.get("service");
  const category = urlParams.get("category");

  const serviceMap = {
    'edupoint': navItems.find(i => i.label === 'EduPoint')?.children || [],
    'student': navItems.find(i => i.label === 'EduPoint')?.children || [],
    'e-services': navItems.find(i => i.label === 'E-Services')?.children || [],
    'proserve': navItems.find(i => i.label === 'ProServe')?.children || [],
    'onemart': [...new Set(oneMartGroups.flatMap(group => [group.title, ...group.items]))],
    'travel-services': megaGroups.find(g => g.title === 'Travel Services')?.items.map(i => i[0]) || [],
    'travel': megaGroups.find(g => g.title === 'Travel Services')?.items.map(i => i[0]) || [],
    'csc-services': megaGroups.find(g => g.title === 'CSC Services')?.items.map(i => i[0]) || [],
    'documentation': megaGroups.find(g => g.title === 'Documentation')?.items.map(i => i[0]) || [],
    'print-scan': ["Print & Scan", "Photocopy & Printing", "Photocopy & Print", "Color Printing", "Document Scanning", "Scanning", "Lamination", "Lamination Support"],
    'bill-recharge': megaGroups.find(g => g.title === 'Bill & Recharge')?.items.map(i => i[0]) || [],
    'design-services': megaGroups.find(g => g.title === 'Design Services')?.items.map(i => i[0]) || [],
    'design': megaGroups.find(g => g.title === 'Design Services')?.items.map(i => i[0]) || [],
  };

  let servicesToShow = [];
  if (category && serviceMap[category]) {
    servicesToShow = serviceMap[category];
  } else {
    servicesToShow = [ "PAN Card", "Ayushman Card", "Exam Form Filling", "Admit Card Download", "GST Registration", "Bus Ticket", "Train Ticket" ];
  }

  select.innerHTML = '<option value="" disabled>Select a service...</option>';
  servicesToShow.forEach(service => {
    const option = document.createElement("option");
    option.value = service;
    option.textContent = service;
    select.appendChild(option);
  });

  select.innerHTML += `<option value="General Support">General Support</option><option value="other">Other service...</option>`;

  const decodedService = preselectedService ? decodeURIComponent(preselectedService) : null;
  const selectedServiceLabel = () => select.value === "other"
    ? otherServiceInput?.value?.trim()
    : select.value;
  const serviceProfiles = [
    {
      test: /pan|aadhaar|ayushman|voter|passport|birth|income|domicile|caste|police/i,
      icon: "shield-check",
      title: "Government Desk",
      detail: "Prepare official proofs to ensure 100% successful verification and processing.",
      attachTitle: "Attach official documents",
      attachSummary: "Upload only required proofs or share a verified Drive / OneDrive link.",
      placeholder: "Example: Aadhaar available, correction needed, DOB/address proof ready",
      payment: "Receipt can be added after exact service fee is confirmed.",
      safe: "Share Aadhaar front/back only after operator confirmation on verified WhatsApp.",
      time: "Same day",
      mode: "CSC/portal",
      docs: ["Aadhaar Card", "DOB & Address Proof", "Applicant Photo", "Active Mobile Number"]
    },
    {
      test: /gst|msme|signature|fssai|shop|iec|trademark|company/i,
      icon: "briefcase",
      title: "Business Desk",
      detail: "Share registration and KYC details to start quick filing and licensing.",
      attachTitle: "Attach business proofs",
      attachSummary: "Upload owner KYC, address proof, firm details or share a business folder link.",
      placeholder: "Example: Proprietor PAN ready, shop address proof ready, GST/MSME needed",
      payment: "Add transaction ID after business filing fee confirmation.",
      safe: "Keep bank and KYC files view-only in cloud links.",
      time: "1-3 days",
      mode: "filing desk",
      docs: ["Proprietor PAN & Aadhaar", "Business Address Proof", "GST/MSME Details (if any)", "Bank Account Details"]
    },
    {
      test: /photocopy|printing|print|scan|scanning|lamination|copy|pdf|jpeg/i,
      icon: "printer",
      title: "Print Desk",
      detail: "Share page count, file type and finish requirements before final quote.",
      attachTitle: "Attach print or scan files",
      attachSummary: "Upload PDFs/images, photos, certificates or paste a shared Drive link.",
      placeholder: "Example: 10 A4 B&W pages, 2 color copies, scan to PDF, laminate one certificate",
      payment: "Payment proof can be added after page count and quote confirmation.",
      safe: "Use clear files and avoid sharing passwords for cloud links.",
      time: "30 min",
      mode: "print desk",
      docs: ["Print File or Original Document", "Page Size & Quantity", "Color/B&W Preference", "Delivery or Collection Details"]
    },
    {
      test: /exam|admit|result|scholarship|resume|university|ccc|o level/i,
      icon: "graduation-cap",
      title: "Student Desk",
      detail: "Keep academic IDs and detail cards handy for error-free form submissions.",
      attachTitle: "Attach student documents",
      attachSummary: "Upload marksheet/admit card or paste student portal document links.",
      placeholder: "Example: Roll number, registration ID, course name, exam/session details",
      payment: "Receipt is optional. Exam fee proof can be added after payment.",
      safe: "Do not share student portal password in this form.",
      time: "30 min",
      mode: "student desk",
      docs: ["Marksheet or Admit Card", "Registration ID & Roll Number", "Candidate Passport Photo", "Course/Exam Details"]
    },
    {
      test: /ticket|flight|train|bus|hotel|tour/i,
      icon: "plane",
      title: "Travel Booking",
      detail: "Verify passenger details before completing standard portal ticket generation.",
      attachTitle: "Attach travel IDs",
      attachSummary: "Upload passenger ID or paste a shared file link for group bookings.",
      placeholder: "Example: Passenger names, age, route, date, berth/seat preference",
      payment: "Add receipt after fare and seat availability are confirmed.",
      safe: "Ticket fares change quickly. Final booking happens only after confirmation.",
      time: "Live",
      mode: "booking desk",
      docs: ["Passenger Photo ID Proof", "Travel Route & Dates", "Berth or Seat Preferences", "Passenger Mobile Number"]
    },
    {
      test: /sticker|mug|frame|cover|plaque|t-shirt|shirt|branding|card|flyer|poster|label|dtf|wedding|canvas|magnet|packaging|anime/i,
      icon: "sparkles",
      title: "Print Desk",
      detail: "Upload design/artwork assets to get precise quotes and quick prints.",
      attachTitle: "Attach artwork files",
      attachSummary: "Upload print files, logos, reference images or share Drive / OneDrive folders.",
      placeholder: "Example: Size, quantity, finish, color, design file link and delivery preference",
      payment: "Payment proof can be added after artwork and final quote approval.",
      safe: "Use high-resolution artwork for better print quality.",
      time: "2-4 hrs",
      mode: "print desk",
      docs: ["High-Res Artwork/Design", "Reference Image/Layout", "Size & Quantity Specs", "Delivery Address Details"]
    }
  ];

  const profileFor = (label = "") => serviceProfiles.find((profile) => profile.test.test(label)) || {
    icon: "list-checks",
    title: "General Desk",
    detail: "Submit your requirement details and our executive will contact you to proceed.",
    attachTitle: "Attach documents your way",
    attachSummary: "Upload from device or paste a shared Google Drive / OneDrive link.",
    placeholder: "Example: Service details, document names, preferred timeline or special instructions",
    payment: "Optional now. Add receipt only if payment is already done.",
    safe: "Share sensitive IDs only after operator confirmation on verified WhatsApp.",
    time: "30 min",
    mode: "WhatsApp",
    docs: ["Basic ID Proof (Aadhaar)", "Requirement Description", "Reference Document (if any)", "Contact Details"]
  };

  const updateContactHeading = () => {
    const label = selectedServiceLabel();
    const serviceName = label ? label : (category ? category : "Service");
    const profile = profileFor(label || category || "");
    if (formTitle) {
      formTitle.innerHTML = label
        ? `Start ${serviceName} <span class="h2-gold">Request</span>`
        : 'Start Service <span class="h2-gold">Request</span>';
    }
    if (formSummary) {
      formSummary.textContent = "Share details for operator review. Submitting will seamlessly transition you to our unified secure checkout portal.";
    }
    if (trustTitle) {
      trustTitle.textContent = profile.title || "Quick Operator Review";
    }
    if (trustDesc) {
      trustDesc.textContent = profile.detail || "Our dedicated desk reviews your submitted application details and files within 2 hours.";
    }
    if (trustIconBox) {
      trustIconBox.innerHTML = icon(profile.icon || "sparkles", 38);
    }
    if (trustBullets && profile.docs) {
      trustBullets.innerHTML = `
        <div class="text-xs font-bold uppercase tracking-wide" style="color: #C9921A; margin-bottom: 8px;">Required Documents:</div>
        ${profile.docs.map(doc => `
          <div class="form-trust-bullet-item">
            ${icon("file-check", 16)}
            <span>${doc}</span>
          </div>
        `).join('')}
      `;
    }
    if (serviceGuidance) {
      serviceGuidance.innerHTML = `
        <span class="service-guidance-icon">${icon(profile.icon || "shield-check", 22)}</span>
        <div>
          <strong>${serviceName} Checklist & Fee</strong>
          <p>Keep required documents ready. Service processing fee is Rs. 199, payable securely on the next step.</p>
        </div>
      `;
    }
    if (window.lucide) window.lucide.createIcons();
    const consentSpan = document.querySelector('.request-consent span');
    if (consentSpan) {
      consentSpan.textContent = `I agree to share required documents for ${serviceName} service processing and understand that final approval depends on the official department.`;
    }
    if (notesField) notesField.placeholder = profile.placeholder || "Example: Document details, correction needed, or special instructions";
  };

  if (decodedService) {
    if (servicesToShow.includes(decodedService)) {
      select.value = decodedService;
    } else {
      select.value = 'other';
      otherServiceWrapper.style.display = 'block';
      otherServiceInput.value = decodedService;
      otherServiceInput.required = true;
    }
  } else {
    select.value = "";
  }
  updateContactHeading();

  select.addEventListener("change", () => {
    if (select.value === "other") {
      otherServiceWrapper.style.display = "block";
      otherServiceInput.required = true;
      otherServiceInput.focus();
    } else {
      otherServiceWrapper.style.display = "none";
      otherServiceInput.required = false;
      otherServiceInput.value = "";
    }
    updateContactHeading();
  });

  otherServiceInput?.addEventListener("input", updateContactHeading);

  form.addEventListener("submit", (e) => {
    e.preventDefault(); // Prevent standard submission for now
    const mobile = form.querySelector('input[name="mobile"]');
    const digits = mobile?.value.replace(/\D/g, "") || "";

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (digits.length !== 10) {
      mobile?.setCustomValidity("Please enter a valid 10-digit mobile number.");
      mobile?.reportValidity();
      mobile?.setCustomValidity("");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Submitting Review...';
    submitBtn.disabled = true;
    if (window.lucide) window.lucide.createIcons();

    // Simulate network request processing
    setTimeout(() => {
      if (formGrid && formSuccess) {
        formGrid.style.display = "none";
        formSuccess.style.display = "block";
        if (successMessage) {
          successMessage.textContent = `Your ${selectedServiceLabel() || "service"} request is received. We will contact you on your mobile number with document and payment verification steps.`;
        }
        if (window.lucide) window.lucide.createIcons();
      }
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      form.reset();
      select.dispatchEvent(new Event('change')); // Hide "other" input
    }, 800);
  });

  if (formResetBtn) {
    formResetBtn.addEventListener("click", () => {
      formSuccess.style.display = "none";
      formGrid.style.display = "grid";
      updateContactHeading();
    });
  }
}

let opdsCsrfToken = "";

async function getPaymentCsrfToken() {
  if (opdsCsrfToken) return opdsCsrfToken;
  const response = await fetch("/api/csrf");
  const data = await response.json();
  opdsCsrfToken = data.csrfToken || "";
  return opdsCsrfToken;
}

async function paymentApi(path, options = {}) {
  const csrf = await getPaymentCsrfToken();
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": csrf,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Payment request failed.");
  return data;
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some((script) => script.src === src)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Payment script could not load."));
    document.head.appendChild(script);
  });
}

async function openGatewaySession(orderResponse) {
  const payment = orderResponse.payment;
  if (!payment) throw new Error("Payment session missing.");

  const paymentSuccessUrl = () => {
    const params = new URLSearchParams({
      redirect: "dashboard"
    });
    if (payment.orderId) params.set("order_id", payment.orderId);
    const phone = localStorage.getItem("opds_testing_user") || "";
    if (phone) params.set("phone", phone);
    return `payment-success.html?${params.toString()}`;
  };

  if (payment.sessionType === "redirect") {
    window.location.href = payment.session.redirectUrl;
    return;
  }

  if (payment.sessionType === "razorpay_checkout") {
    await loadExternalScript("https://checkout.razorpay.com/v1/checkout.js");
    if (!window.Razorpay) throw new Error("Razorpay checkout unavailable.");
    const options = {
      ...payment.session,
      handler: async (response) => {
        await paymentApi("/api/payments/verify", {
          method: "POST",
          body: JSON.stringify({ gateway: "razorpay", ...response })
        });
        window.location.href = paymentSuccessUrl();
      },
      modal: {
        ondismiss: () => {
          window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId)}&payment_id=${encodeURIComponent(payment.paymentId)}`;
        }
      }
    };
    new window.Razorpay(options).open();
    return;
  }

  window.location.href = `payment-pending.html?order_id=${encodeURIComponent(payment.orderId)}`;
}

function inferServiceSlug(form) {
  if (form.dataset.serviceSlug) return form.dataset.serviceSlug;
  const hidden = form.querySelector('input[name="service_slug"]')?.value;
  if (hidden) return hidden;
  const page = getCurrentPage();
  const map = {
    "service-pan-card.html": "pan-card",
    "service-gst-registration.html": "gst-registration",
    "service-msme-registration.html": "msme-registration",
    "service-digital-signature.html": "digital-signature",
    "service-fssai-license.html": "fssai-license",
    "service-shop-license.html": "shop-license",
    "service-iec-code.html": "iec-code",
    "service-trademark-registration.html": "trademark-registration",
    "service-company-registration.html": "company-registration",
    "print-scan.html": "print-scan",
    "service-photocopy-printing.html": "photocopy-printing",
    "service-color-printing.html": "color-printing",
    "service-document-scanning.html": "document-scanning",
    "service-lamination.html": "lamination",
    "edupoint.html": "exam-form-filling",
    "business-solutions.html": "gst-registration",
    "online-services.html": "pan-card"
  };
  return map[page] || "pan-card";
}

function getServiceBookingKey(form) {
  if (form.dataset.idempotencyKey) return form.dataset.idempotencyKey;
  const service = inferServiceSlug(form);
  form.dataset.idempotencyKey = `svc_${service}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return form.dataset.idempotencyKey;
}

function unifiedApplyProfile(label = "", category = "") {
  const value = `${label} ${category}`.toLowerCase();
  const profiles = [
    {
      test: /pan|aadhaar|ayushman|voter|passport|birth|income|domicile|caste|police|kisan|pension|jan seva/i,
      icon: "shield-check",
      detail: "Provide your basic details and keep official documents ready for operator review.",
      upload: "Attach Aadhaar, address proof, DOB proof, photos or paste a shared Google Drive link.",
      docs: "Aadhaar, address proof, DOB proof, photo/signature scans",
      placeholder: "Example: Aadhaar available, correction needed, DOB/address proof ready"
    },
    {
      test: /gst|msme|signature|fssai|shop|iec|trademark|company|business/i,
      icon: "briefcase",
      detail: "Provide business details and keep KYC documents ready for operator review.",
      upload: "Attach owner KYC, address proof, firm documents or paste a shared business folder link.",
      docs: "Owner KYC, business address proof, firm details, bank details",
      placeholder: "Example: Proprietor PAN ready, shop address proof ready, GST/MSME needed"
    },
    {
      test: /photocopy|printing|print|scan|scanning|lamination|copy|pdf|jpeg/i,
      icon: "printer",
      detail: "Provide print, scan or lamination details so the operator can confirm page count and quote.",
      upload: "Attach print files, photos, certificates or paste a shared Drive link for quick review.",
      docs: "Print file, page size, quantity, color mode, scan format or lamination size",
      placeholder: "Example: 10 A4 B&W pages, 2 color copies, scan to PDF, laminate one certificate"
    },
    {
      test: /exam|admit|result|scholarship|resume|university|ccc|o level/i,
      icon: "graduation-cap",
      detail: "Provide student or document details for quick form and print support.",
      upload: "Attach marksheet, admit card, student ID, photo or paste the related portal document link.",
      docs: "Marksheet/admit card, registration ID, photo, course or exam details",
      placeholder: "Example: Roll number, registration ID, course name, exam/session details"
    },
    {
      test: /ticket|flight|train|bus|hotel|tour|travel/i,
      icon: "plane",
      detail: "Provide passenger and route details before ticket or booking confirmation.",
      upload: "Attach passenger ID proof or paste a shared file link for group booking details.",
      docs: "Passenger ID proof, route/date details, seat preference, mobile number",
      placeholder: "Example: Passenger names, age, route, date, berth/seat preference"
    },
    {
      test: /design|logo|flex|banner|card|post|print|sticker|mug|frame|shirt|plaque|label|order/i,
      icon: "sparkles",
      detail: "Provide design, artwork or print requirements so the operator can confirm the quote.",
      upload: "Attach artwork, logo, reference images or paste a shared Google Drive folder.",
      docs: "Artwork/design files, reference image, size, quantity and delivery details",
      placeholder: "Example: Size, quantity, finish, color, design file link and delivery preference"
    }
  ];

  return profiles.find((profile) => profile.test.test(value)) || {
    icon: "list-checks",
    detail: "Provide service details and our operator will review the request before checkout.",
    upload: "Attach required files or paste a shared Google Drive link.",
    docs: "Basic ID proof, requirement details, reference document, contact details",
    placeholder: "Example: Service details, document names, preferred timeline or special instructions"
  };
}

function ensureHiddenInput(form, name) {
  let input = form.querySelector(`input[name="${name}"]`);
  if (input) return input;
  input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  form.prepend(input);
  return input;
}

function getAllServiceOptions() {
  const values = [
    "PAN Card",
    "New PAN",
    "PAN Correction",
    "E-PAN Download",
    "Card Reprint",
    ...navItems.flatMap((item) => item.children || []),
    ...megaGroups.flatMap((group) => group.items.map((item) => item[0])),
    ...servicesMegaGroups.flatMap((group) => group.items.map((item) => item[0])),
    ...Object.keys(serviceRoutes)
  ];
  return [...new Set(values)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function uniqueServiceOptions(values = []) {
  return [...new Set(values.map((value) => (value || "").trim()).filter(Boolean))];
}

function getApplyCategoryOptions(category = "general") {
  const key = (category || "general").toLowerCase();
  const map = {
    edupoint: navItems.find((item) => item.label === "EduPoint")?.children || [],
    student: navItems.find((item) => item.label === "EduPoint")?.children || [],
    "e-services": [
      "PAN Card",
      "New PAN",
      "PAN Correction",
      "E-PAN Download",
      "Card Reprint",
      "Ayushman Card",
      "Voter ID",
      "Passport Assistance",
      "Birth Certificate",
      "Income Certificate",
      "Domicile Certificate",
      "Caste Certificate",
      "Police Verification"
    ],
    proserve: [
      "GST Registration",
      "MSME Registration",
      "Digital Signature",
      "Digital Signature (DSC)",
      "FSSAI",
      "FSSAI License",
      "Shop License",
      "IEC Code",
      "Trademark",
      "Trademark Registration",
      "Company Registration"
    ],
    business: [
      "GST Registration",
      "MSME Registration",
      "Digital Signature",
      "Digital Signature (DSC)",
      "FSSAI",
      "FSSAI License",
      "Shop License",
      "IEC Code",
      "Trademark",
      "Trademark Registration",
      "Company Registration"
    ],
    onemart: ["Custom Print Order", "OneMart Bulk Order", ...oneMartGroups.flatMap((group) => [group.title, ...group.items])],
    products: ["Custom Print Order", "OneMart Bulk Order", ...oneMartGroups.flatMap((group) => [group.title, ...group.items])],
    "travel-services": megaGroups.find((group) => group.title === "Travel Services")?.items.map((item) => item[0]) || [],
    travel: megaGroups.find((group) => group.title === "Travel Services")?.items.map((item) => item[0]) || [],
    "print-scan": ["Print & Scan", "Photocopy & Printing", "Photocopy & Print", "Color Printing", "Document Scanning", "Scanning", "Lamination", "Lamination Support"],
    documentation: ["Print & Scan", "Photocopy & Printing", "Photocopy & Print", "Color Printing", "Document Scanning", "Scanning", "Lamination", "Lamination Support"],
    "design-services": ["Design Services", ...(megaGroups.find((group) => group.title === "Design Services")?.items.map((item) => item[0]) || [])],
    design: ["Design Services", ...(megaGroups.find((group) => group.title === "Design Services")?.items.map((item) => item[0]) || [])],
    "csc-services": [
      ...(megaGroups.find((group) => group.title === "CSC Services")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Documentation")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Bill & Recharge")?.items.map((item) => item[0]) || [])
    ],
    csc: [
      ...(megaGroups.find((group) => group.title === "CSC Services")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Documentation")?.items.map((item) => item[0]) || []),
      ...(megaGroups.find((group) => group.title === "Bill & Recharge")?.items.map((item) => item[0]) || [])
    ],
    support: ["WhatsApp Support", "Call Support", "General Support"]
  };

  return uniqueServiceOptions(map[key] || []);
}

let websiteCatalogCache = null;

function escapeOption(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchWebsiteCatalog() {
  if (websiteCatalogCache) return websiteCatalogCache;
  const response = await fetch("/api/products", { cache: "no-store" });
  if (!response.ok) throw new Error("Catalog unavailable");
  const data = await response.json();
  websiteCatalogCache = {
    services: Array.isArray(data.services) ? data.services.filter((item) => item.active !== false) : [],
    products: Array.isArray(data.products) ? data.products.filter((item) => item.active !== false) : []
  };
  return websiteCatalogCache;
}

function catalogCategoryAliases(category = "general") {
  const key = (category || "general").toLowerCase();
  const aliases = {
    edupoint: ["EduPoint"],
    student: ["EduPoint"],
    "e-services": ["E-Services", "Govt / E-Services"],
    proserve: ["ProServe", "Business"],
    business: ["ProServe", "Business"],
    onemart: ["Personalized Gifts", "Sticker Printing", "T-Shirt Printing", "UV DTF Printing", "Business Branding", "Trending Products"],
    products: ["Personalized Gifts", "Sticker Printing", "T-Shirt Printing", "UV DTF Printing", "Business Branding", "Trending Products"],
    "travel-services": ["Travel Services", "Travel Booking", "Travel"],
    travel: ["Travel Services", "Travel Booking", "Travel"],
    "design-services": ["Design Services"],
    design: ["Design Services"],
    "csc-services": ["CSC Services", "Documentation", "Bill & Recharge"],
    csc: ["CSC Services", "Documentation", "Bill & Recharge"]
  };
  return aliases[key] || [];
}

function getDynamicCatalogOptions(catalog, category = "general", requestedService = "") {
  const current = getCurrentPage();
  if (current === "contact.html" && category === "general") {
    const serviceOptions = (catalog.services || []).map((item) => item.name);
    const productOptions = (catalog.products || []).map((item) => item.name);
    const options = uniqueServiceOptions(["Select a Service", ...serviceOptions, ...productOptions]);
    return options;
  }

  const aliases = catalogCategoryAliases(category);
  if (!aliases.length) return [];

  const serviceOptions = (catalog.services || [])
    .filter((item) => aliases.includes(item.category))
    .map((item) => item.name);
  const productOptions = (catalog.products || [])
    .filter((item) => aliases.includes(item.category))
    .map((item) => item.name);
  const options = uniqueServiceOptions([...serviceOptions, ...productOptions]);

  if (requestedService && requestedService !== "Service Request" && !options.includes(requestedService)) {
    options.unshift(requestedService);
  }
  return options;
}

function inferApplyCategory(explicitCategory = "", requestedService = "") {
  const current = getCurrentPage();
  const pageMap = {
    "online-services.html": "e-services",
    "service-pan-card.html": "e-services",
    "service-ayushman-card.html": "e-services",
    "service-voter-id.html": "e-services",
    "service-passport-assistance.html": "e-services",
    "service-birth-certificate.html": "e-services",
    "service-income-certificate.html": "e-services",
    "service-domicile-certificate.html": "e-services",
    "service-caste-certificate.html": "e-services",
    "service-police-verification.html": "e-services",
    "business-solutions.html": "proserve",
    "service-gst-registration.html": "proserve",
    "service-msme-registration.html": "proserve",
    "service-digital-signature.html": "proserve",
    "service-fssai-license.html": "proserve",
    "service-shop-license.html": "proserve",
    "service-iec-code.html": "proserve",
    "service-trademark-registration.html": "proserve",
    "service-company-registration.html": "proserve",
    "print-scan.html": "print-scan",
    "service-photocopy-printing.html": "print-scan",
    "service-color-printing.html": "print-scan",
    "service-document-scanning.html": "print-scan",
    "service-lamination.html": "print-scan",
    "edupoint.html": "edupoint",
    "travel-services.html": "travel-services",
    "design-services.html": "design-services",
    "csc-services.html": "csc-services",
    "products.html": "onemart",
    "product-detail.html": "onemart",
    "support.html": "support"
  };

  if (current === "contact.html") {
    const params = new URLSearchParams(window.location.search);
    const fromPage = params.get("from");
    if (fromPage && pageMap[fromPage]) {
      return pageMap[fromPage];
    }

    let referrerPage = "";
    try {
      if (document.referrer) {
        const url = new URL(document.referrer);
        referrerPage = url.pathname.substring(url.pathname.lastIndexOf("/") + 1);
      }
    } catch (e) {}
    if (referrerPage && pageMap[referrerPage]) {
      return pageMap[referrerPage];
    }
  }

  if (pageMap[current]) return pageMap[current];
  if (explicitCategory && getApplyCategoryOptions(explicitCategory).length) return explicitCategory;

  const normalizedService = (requestedService || "").toLowerCase();
  const match = ["e-services", "proserve", "edupoint", "print-scan", "travel-services", "design-services", "csc-services", "onemart", "support"]
    .find((key) => getApplyCategoryOptions(key).some((service) => service.toLowerCase() === normalizedService));
  return match || "general";
}

function getScopedServiceOptions(category = "general", requestedService = "") {
  const current = getCurrentPage();
  if (current === "contact.html" && category === "general") {
    const allServices = [
      "Select a Service",
      // E-services
      "PAN Card", "New PAN", "PAN Correction", "E-PAN Download", "Card Reprint",
      "Ayushman Card", "Voter ID", "Passport Assistance", "Birth Certificate",
      "Income Certificate", "Domicile Certificate", "Caste Certificate", "Police Verification",
      // Business
      "GST Registration", "MSME Registration", "Digital Signature", "FSSAI License",
      "Shop License", "IEC Code", "Trademark Registration", "Company Registration",
      // Student
      "Exam Form Filling", "Scholarship Form", "College Admission Form", "University Registration",
      // Travel
      "Bus Ticket", "Flight Ticket", "Train Ticket Booking", "Hotel Booking", "Tour Package Assistance",
      // Print/Scan
      "Print & Scan", "Photocopy & Printing", "Color Printing", "Document Scanning", "Lamination",
      // Design
      "Logo Design", "Flex Design", "Visiting Card", "Banner Design", "Social Media Creative",
      // CSC
      "PM Kisan", "Pension Assistance", "Electricity Bill", "FASTag Recharge", "DTH Recharge"
    ];
    return uniqueServiceOptions(allServices);
  }

  const options = getApplyCategoryOptions(category);
  if (options.length) return options;
  if (requestedService && requestedService !== "Service Request") return [requestedService];
  return ["PAN Card", "Ayushman Card", "GST Registration", "Exam Form Filling", "Bus Ticket", "Logo Design"];
}

function defaultApplyServiceForPage() {
  const pageService = document.querySelector("[data-default-service]")?.getAttribute("data-default-service");
  if (pageService) return pageService;

  const current = getCurrentPage();
  const map = {
    "service-pan-card.html": "PAN Card",
    "online-services.html": "Ayushman Card",
    "business-solutions.html": "GST Registration",
    "service-gst-registration.html": "GST Registration",
    "service-msme-registration.html": "MSME Registration",
    "service-digital-signature.html": "Digital Signature",
    "service-fssai-license.html": "FSSAI License",
    "service-shop-license.html": "Shop License",
    "service-iec-code.html": "IEC Code",
    "service-trademark-registration.html": "Trademark Registration",
    "service-company-registration.html": "Company Registration",
    "print-scan.html": "Print & Scan",
    "service-photocopy-printing.html": "Photocopy & Printing",
    "service-color-printing.html": "Color Printing",
    "service-document-scanning.html": "Document Scanning",
    "service-lamination.html": "Lamination",
    "edupoint.html": "Exam Form Filling",
    "travel-services.html": "Bus Ticket",
    "design-services.html": "Logo Design",
    "csc-services.html": "PM Kisan",
    "products.html": "Custom Print Order",
    "support.html": "WhatsApp Support"
  };
  return map[current] || "";
}

function shouldInjectUnifiedApplyForm() {
  if (document.querySelector("#pan-apply-form[data-apply-form]")) return false;
  const current = getCurrentPage();
  const pages = new Set([
    "online-services.html",
    "business-solutions.html",
    "edupoint.html",
    "travel-services.html",
    "design-services.html",
    "csc-services.html",
    "products.html",
    "support.html",
    "contact.html"
  ]);
  if (document.querySelector("[data-default-service]")) return !current.startsWith("checkout") && !current.startsWith("payment-");
  return pages.has(current);
}

/* ─────────────────────────────────────────────────────
   FIREBASE CONFIG — apna Firebase project config yahan paste karo
   ───────────────────────────────────────────────────── */
const OPDS_FIREBASE_CONFIG = {
  apiKey:            "",
  authDomain:        "",
  projectId:         "",
  storageBucket:     "",
  messagingSenderId: "",
  appId:             ""
};

function generateOrderId() {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `OP-${yy}${mm}${dd}-${rand}`;
}

function _getDB() {
  if (typeof firebase === "undefined" || !OPDS_FIREBASE_CONFIG.apiKey) return null;
  if (!firebase.apps.length) firebase.initializeApp(OPDS_FIREBASE_CONFIG);
  return firebase.firestore();
}

function saveOrder(data) {
  const db = _getDB();
  if (!db) return;
  const { orderId, isNewRecord, ...rest } = data;
  const ts = firebase.firestore.FieldValue.serverTimestamp();
  const payload = { ...rest, updatedAt: ts };
  if (isNewRecord) payload.createdAt = ts;
  db.collection("orders").doc(orderId).set(payload, { merge: true }).catch(() => {});
}

function isDrawerPage() {
  return new Set([
    "online-services.html", "business-solutions.html", "edupoint.html",
    "travel-services.html", "design-services.html", "csc-services.html",
    "products.html", "support.html", "contact.html"
  ]).has(getCurrentPage());
}

window.openApplyDrawer = function(serviceName) {
  const drawer = document.querySelector(".unified-apply-section.as-drawer");
  const backdrop = document.querySelector(".apply-drawer-backdrop");
  if (!drawer) return;
  if (serviceName) {
    const sel = drawer.querySelector("#pan-service-type");
    if (sel && sel.value !== serviceName) {
      sel.value = serviceName;
      window._applySelectedService?.();
    }
  }
  drawer.classList.add("drawer-is-open");
  backdrop?.classList.add("is-open");
  document.body.style.overflow = "hidden";
  setTimeout(() => drawer.querySelector("input:not([type=hidden])")?.focus(), 360);
};

window.closeApplyDrawer = function() {
  const drawer = document.querySelector(".unified-apply-section.as-drawer");
  const backdrop = document.querySelector(".apply-drawer-backdrop");
  drawer?.classList.remove("drawer-is-open");
  backdrop?.classList.remove("is-open");
  document.body.style.overflow = "";
};

const STYPE_CARDS_MAP = {
  "Bus Ticket": [
    { value: "Bus Ticket One Way",   icon: "bus",        label: "One Way",    price: "₹49"  },
    { value: "Bus Ticket Round",     icon: "repeat",     label: "Round Trip", price: "₹79"  }
  ],
  "Train Ticket": [
    { value: "Train General Ticket", icon: "train",      label: "General",    price: "₹99"  },
    { value: "Train Tatkal Ticket",  icon: "zap",        label: "Tatkal",     price: "₹149" },
    { value: "Train Premium Tatkal", icon: "gauge",      label: "Premium",    price: "₹199" }
  ],
  "Flight Ticket": [
    { value: "Domestic Flight",      icon: "plane",      label: "Domestic",      price: "₹149" },
    { value: "International Flight",  icon: "globe",      label: "International",  price: "₹299" }
  ],
  "Hotel Booking": [
    { value: "Hotel Budget Stay",    icon: "bed",        label: "Budget",     price: "₹99"  },
    { value: "Hotel Premium Stay",   icon: "hotel",      label: "Premium",    price: "₹149" }
  ],
  "Tour Package": [
    { value: "Pilgrimage Package",   icon: "landmark",   label: "Pilgrimage", price: "₹299" },
    { value: "Hill Station Package", icon: "mountain",   label: "Hills",      price: "₹399" },
    { value: "Beach Package",        icon: "palmtree",   label: "Beach",      price: "₹499" }
  ],
  "Ayushman Card": [
    { value: "Ayushman Card Check", icon: "heart-pulse",     label: "Check & Apply", price: "₹49"  },
    { value: "Ayushman Reprint",    icon: "printer",         label: "Card Reprint",  price: "₹29"  }
  ],
  "Voter ID": [
    { value: "Voter ID Registration", icon: "user-plus",      label: "New Register",   price: "₹99"  },
    { value: "Voter ID Correction",   icon: "edit-3",         label: "Correction",     price: "₹79"  },
    { value: "e-EPIC Download",       icon: "download-cloud", label: "e-EPIC",         price: "₹49"  },
    { value: "Voter ID Address",      icon: "map-pin",        label: "Address Change", price: "₹79"  }
  ],
  "Passport Assistance": [
    { value: "Fresh Passport",   icon: "book-open",  label: "Fresh Passport", price: "₹299" },
    { value: "Passport Renewal", icon: "refresh-cw", label: "Renewal",        price: "₹249" },
    { value: "Tatkal Passport",  icon: "zap",        label: "Tatkal",         price: "₹499" }
  ],
  "Birth Certificate": [
    { value: "Birth Certificate",            icon: "baby",   label: "New Certificate", price: "₹149" },
    { value: "Birth Certificate Correction", icon: "edit-3", label: "Correction",      price: "₹99"  },
    { value: "Birth Certificate Duplicate",  icon: "copy",   label: "Duplicate",       price: "₹79"  }
  ],
  "Income Certificate": [
    { value: "Income Certificate",        icon: "receipt-text", label: "New Certificate", price: "₹99"  },
    { value: "Income Certificate Urgent", icon: "zap",          label: "Urgent",          price: "₹149" }
  ],
  "Domicile Certificate": [
    { value: "Domicile Certificate", icon: "home",       label: "New Certificate", price: "₹99" },
    { value: "Domicile Renewal",     icon: "refresh-cw", label: "Renewal",         price: "₹49" }
  ],
  "Caste Certificate": [
    { value: "Caste Certificate", icon: "badge-check", label: "New Certificate", price: "₹99" },
    { value: "Caste Renewal",     icon: "refresh-cw",  label: "Renewal",         price: "₹49" }
  ],
  "Police Verification": [
    { value: "Police Verification", icon: "shield",      label: "New Verification", price: "₹199" },
    { value: "Police Renewal",      icon: "refresh-cw",  label: "Renewal",          price: "₹99"  }
  ],
  "GST Registration": [
    { value: "GST New Registration", icon: "file-plus",  label: "New Register",  price: "₹499+" },
    { value: "GST Amendment",        icon: "edit-3",     label: "Amendment",     price: "₹299+" },
    { value: "GST Return Filing",    icon: "file-text",  label: "Return Filing", price: "₹399+" }
  ],
  "MSME Registration": [
    { value: "MSME Registration", icon: "factory", label: "New Udyam", price: "₹299" },
    { value: "MSME Update",       icon: "edit-3",  label: "Update",    price: "₹199" }
  ],
  "Digital Signature": [
    { value: "DSC Class 2", icon: "pen-tool",     label: "Class 2 DSC", price: "₹999+"  },
    { value: "DSC Class 3", icon: "shield-check", label: "Class 3 DSC", price: "₹1499+" },
    { value: "DSC Renewal", icon: "refresh-cw",   label: "Renewal",     price: "₹799+"  }
  ],
  "FSSAI License": [
    { value: "FSSAI Basic",   icon: "utensils", label: "Basic License",   price: "₹499+"  },
    { value: "FSSAI State",   icon: "building", label: "State License",   price: "₹999+"  },
    { value: "FSSAI Central", icon: "landmark", label: "Central License", price: "₹1499+" }
  ],
  "Shop License": [
    { value: "Shop License New",     icon: "store",      label: "New License", price: "₹499+" },
    { value: "Shop License Renewal", icon: "refresh-cw", label: "Renewal",     price: "₹299+" }
  ],
  "IEC Code": [
    { value: "IEC Registration", icon: "package", label: "New IEC",      price: "₹499+" },
    { value: "IEC Modification", icon: "edit-3",  label: "Modification", price: "₹299+" }
  ],
  "Trademark Registration": [
    { value: "Trademark Filing",  icon: "bookmark",       label: "New Filing", price: "₹999+" },
    { value: "Trademark Renewal", icon: "refresh-cw",     label: "Renewal",    price: "₹599+" },
    { value: "Trademark Reply",   icon: "message-square", label: "TM Reply",   price: "₹799+" }
  ],
  "Company Registration": [
    { value: "Private Limited",  icon: "building-2", label: "Pvt. Limited", price: "₹1999+" },
    { value: "LLP Registration", icon: "users",      label: "LLP",          price: "₹1499+" },
    { value: "OPC Registration", icon: "user",       label: "OPC",          price: "₹1999+" }
  ],
  "Photocopy & Printing": [
    { value: "BW Photocopy",   icon: "copy",    label: "B&W Copies",  price: "₹1+/pg" },
    { value: "Color Printing", icon: "printer", label: "Color Print",  price: "₹5+/pg" }
  ],
  "Color Printing": [
    { value: "Color Copies", icon: "printer", label: "Color Copies", price: "₹5+/pg" },
    { value: "Photo Print",  icon: "image",   label: "Photo Print",  price: "₹20+"   }
  ],
  "Document Scanning": [
    { value: "Document Scan", icon: "scan-line", label: "Scan to PDF", price: "₹10+/pg" },
    { value: "Photo Scan",    icon: "image",     label: "Photo Scan",  price: "₹15+"    }
  ],
  "Lamination": [
    { value: "Standard Laminate", icon: "layers", label: "Standard", price: "₹20+" },
    { value: "Photo Laminate",    icon: "image",  label: "Photo",    price: "₹30+" }
  ]
};

function injectUnifiedApplyForm() {
  if (!shouldInjectUnifiedApplyForm()) return;
  const main = document.querySelector("main");
  if (!main) return;
  const formSlot = main.querySelector("[data-unified-apply-slot]");
  const useDrawer = isDrawerPage();
  const drawerHeader = useDrawer ? `
    <div class="apply-drawer-header">
      <div class="apply-drawer-header-meta">
        <span>E-Service Application</span>
        <strong id="drawer-header-label">Start Request</strong>
      </div>
      <button type="button" class="apply-drawer-close" onclick="window.closeApplyDrawer()" aria-label="Close">
        <i data-lucide="x"></i>
      </button>
    </div>` : '';
  const drawerClass = useDrawer ? ' as-drawer' : '';
  const formHtml = `
    <section class="section reveal visible unified-apply-section${drawerClass}" id="apply-now">
    ${drawerHeader}
      <div class="site-container">
        <div class="request-form-header">
          <p class="section-kicker">Apply Now</p>
          <h2>Start Service <span class="h2-gold">Request</span></h2>
          <p>Share details for operator review. Submitting will take you to the unified secure checkout portal.</p>
        </div>
                <div class="apply-cockpit">
          <aside class="apply-rail">
            <span class="apply-rail-eyebrow">E-Service Application</span>
            <div class="apply-rail-chip">
              <span class="apply-rail-chip-label">Applying for</span>
              <strong class="apply-rail-service" id="rail-service-name">Service Request</strong>
              <div class="apply-rail-price-row">
                <span class="apply-rail-price" id="rail-service-price">Rs. 199</span>
                <span class="apply-rail-price-note">operator fee</span>
              </div>
            </div>
            <div class="checkout-progress-bar wizard-progress" id="wizard-progress-bar">
              <div class="progress-step active" data-wizard-step="1">
                <span class="step-num">1</span>
                <span class="step-text">Details</span>
                <span class="step-sub">Personal &amp; service info</span>
              </div>
              <div class="progress-line" data-wizard-line="1"><span class="fill"></span></div>
              <div class="progress-step" data-wizard-step="2">
                <span class="step-num">2</span>
                <span class="step-text">Uploads</span>
                <span class="step-sub">Document vault</span>
              </div>
              <div class="progress-line" data-wizard-line="2"><span class="fill"></span></div>
              <div class="progress-step" data-wizard-step="3">
                <span class="step-num">3</span>
                <span class="step-text">Payment</span>
                <span class="step-sub">Review &amp; submit</span>
              </div>
            </div>
            <div class="apply-rail-trust">
              <div class="apply-rail-trust-item">${icon("lock", 15)} 100% encrypted checkout</div>
              <div class="apply-rail-trust-item">${icon("shield-check", 15)} Operator-verified process</div>
              <div class="apply-rail-trust-item">${icon("clock", 15)} Pay only after review</div>
            </div>
          </aside>
          <div class="apply-workarea">
      <form class="panel service-request-panel service-request-panel-modern pan-request-card glass-panel" data-apply-form data-service-slug="service-request" id="pan-apply-form">
        <input type="hidden" name="service_slug" value="service-request">
        <input type="hidden" name="service_name" value="Service Request">

        <div class="wizard-step-panel" id="wizard-step-1">
          <div class="service-guidance premium-guidance-box">
            <span class="service-guidance-icon">${icon("shield-check", 22)}</span>
            <div>
              <strong>Personal & Service Details</strong>
              <p>Provide your basic details and keep official documents ready for operator review.</p>
            </div>
          </div>
          <div class="form-grid compact-request-grid premium-form-grid" style="margin-bottom: 0 !important;">
            <div class="form-field">
              <label for="pan-name">Full Name <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("user", 18)}
                <input class="input" id="pan-name" name="name" autocomplete="name" placeholder="As per document" required>
              </div>
            </div>
            <div class="form-field">
              <label for="pan-mobile">Mobile Number <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("phone", 18)}
                <input class="input" id="pan-mobile" name="mobile" type="tel" inputmode="numeric" autocomplete="tel" pattern="[0-9]{10}" maxlength="10" placeholder="10-digit mobile number" required>
              </div>
            </div>
            <div class="form-field">
              <label for="pan-email">Email Address</label>
              <div class="input-with-icon">
                ${icon("mail", 18)}
                <input class="input" id="pan-email" name="email" type="email" autocomplete="email" placeholder="Optional email">
              </div>
            </div>
            <div class="form-field full" id="field-service-type">
              <label>Service Type <span aria-hidden="true">*</span></label>
              <div class="stype-cards" id="stype-cards-inject"></div>
              <select id="pan-service-type" name="service_type" style="display:none" required></select>
            </div>
            <div class="form-group-label">Address Details</div>
            <div class="form-field full" id="field-address">
              <label for="pan-address">Address <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("map-pin", 18)}
                <input class="input" id="pan-address" name="address" autocomplete="street-address" placeholder="House No., Street, Locality / Village" required>
              </div>
            </div>
            <div class="form-field" id="field-pincode">
              <label for="pan-pincode">PIN Code <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("hash", 18)}
                <input class="input" id="pan-pincode" name="pincode" type="text" inputmode="numeric" autocomplete="postal-code" pattern="[0-9]{6}" maxlength="6" placeholder="6-digit PIN code" required>
              </div>
            </div>
            <div class="form-field" id="field-district">
              <label for="pan-district">District <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("building-2", 18)}
                <input class="input" id="pan-district" name="district" autocomplete="address-level2" placeholder="District name" required>
              </div>
            </div>
            <div class="form-field" id="field-state">
              <label for="pan-state">State <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("map", 18)}
                <select class="select" id="pan-state" name="state" autocomplete="address-level1" required>
                  <option value="">Select State</option>
                  <option>Andhra Pradesh</option><option>Arunachal Pradesh</option><option>Assam</option>
                  <option>Bihar</option><option>Chhattisgarh</option><option>Goa</option>
                  <option>Gujarat</option><option>Haryana</option><option>Himachal Pradesh</option>
                  <option>Jharkhand</option><option>Karnataka</option><option>Kerala</option>
                  <option>Madhya Pradesh</option><option>Maharashtra</option><option>Manipur</option>
                  <option>Meghalaya</option><option>Mizoram</option><option>Nagaland</option>
                  <option>Odisha</option><option>Punjab</option><option>Rajasthan</option>
                  <option>Sikkim</option><option>Tamil Nadu</option><option>Telangana</option>
                  <option>Tripura</option><option>Uttar Pradesh</option><option>Uttarakhand</option>
                  <option>West Bengal</option>
                  <option>Andaman &amp; Nicobar Islands</option><option>Chandigarh</option>
                  <option>Dadra &amp; Nagar Haveli and Daman &amp; Diu</option>
                  <option>Delhi</option><option>Jammu &amp; Kashmir</option><option>Ladakh</option>
                  <option>Lakshadweep</option><option>Puducherry</option>
                </select>
              </div>
            </div>
            <div class="form-field conditional-field" id="field-pan-number">
              <label for="existing-pan-number">Existing PAN Number <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("credit-card", 18)}
                <input class="input" id="existing-pan-number" name="existing_pan_number" placeholder="10-digit PAN (e.g. ABCDE1234F)" pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}" maxlength="10">
              </div>
            </div>
            <div class="form-field conditional-field" id="field-correction-type">
              <label for="correction-type-select">Correction Type <span aria-hidden="true">*</span></label>
              <div class="input-with-icon">
                ${icon("edit", 18)}
                <select class="select" id="correction-type-select" name="correction_type">
                  <option value="">Select Correction Type</option>
                  <option value="name">Name Correction</option>
                  <option value="dob">Date of Birth Correction</option>
                  <option value="photo_signature">Photo & Signature Change</option>
                  <option value="father_name">Father's Name Correction</option>
                  <option value="multiple">Multiple Corrections</option>
                </select>
              </div>
            </div>
          </div>
          <div class="wizard-actions">
            <button type="button" class="btn btn-primary font-bold" onclick="goToStep(2)">
              Next: Upload Documents ${icon("arrow-right", 16)}
            </button>
          </div>
        </div>

        <div class="wizard-step-panel" id="wizard-step-2" style="display: none;">
          <div class="service-guidance premium-guidance-box">
            <span class="service-guidance-icon">${icon("folder-up", 22)}</span>
            <div>
              <strong>Document Attachment Vault</strong>
              <p>Attach required documents or paste Google Drive link.</p>
            </div>
          </div>
          <div class="upload-hub payment-upload-hub premium-upload-hub" aria-label="Service document attachment options">
            <div class="upload-row-layout">
              <div class="upload-action-card square-action-card" onclick="document.getElementById('pan-documents').click()" title="Choose local files from device">
                <input id="pan-documents" name="pan_documents" type="file" multiple accept="image/*,.pdf,.doc,.docx" onchange="window.handleDeviceUpload(this)" style="display: none;">
                <div class="action-card-icon">${icon("upload-cloud", 18)}</div>
                <span>Upload from Device</span>
              </div>
              <div class="upload-action-card square-action-card" onclick="window.syncGoogleDrive()" title="Attach Google Drive Link">
                <div class="action-card-icon">${icon("link-2", 18)}</div>
                <span>Attach Google Drive Link</span>
              </div>
              <div class="upload-action-card square-action-card" onclick="window.openCompressorApp()" title="Open File Compressor & Converter App">
                <div class="action-card-icon">${icon("minimize-2", 18)}</div>
                <span>Compress Large File</span>
              </div>
              <div class="upload-drive-card">
                <div class="drive-card-header">
                  ${icon("cloud", 16)}
                  <strong>Google Drive Link</strong>
                </div>
                <div class="cloud-link-input-group">
                  <input class="input" id="pan-google-drive" name="pan_google_drive_link" type="url" placeholder="Paste shared Drive link">
                  <button type="button" class="btn btn-primary btn-save-cloud" onclick="saveCloudLink(this)">Save</button>
                </div>
                <span class="field-help">Use view access for the shared file or folder.</span>
              </div>
            </div>
            <div class="upload-status-footer">
              <span class="field-help">Accepted: Aadhaar, address proof, DOB proof, photo/signature scans (Max 1MB/file, up to 10 files).</span>
              <div id="attachment-file-list" class="attachment-file-list"></div>
            </div>
          </div>
          <div class="form-field full">
            <label for="pan-notes">Notes or Special Instructions (Optional)</label>
            <textarea class="textarea" id="pan-notes" name="notes" placeholder="Example: Document details, correction needed, or special instructions"></textarea>
          </div>
          <div class="wizard-actions">
            <button type="button" class="btn btn-soft font-bold" onclick="goToStep(1)">
              ${icon("arrow-left", 16)} Back
            </button>
            <button type="button" class="btn btn-primary font-bold" onclick="goToStep(3)">
              Next: Review & Payment ${icon("arrow-right", 16)}
            </button>
          </div>
        </div>

        <div class="wizard-step-panel" id="wizard-step-3" style="display: none;">
          <div class="service-guidance premium-guidance-box">
            <span class="service-guidance-icon">${icon("receipt", 22)}</span>
            <div>
              <strong>Payment Review</strong>
              <p>Review the fee breakdown and agree to terms to complete your request.</p>
            </div>
          </div>
          <div class="checkout-step-container">
            <div class="fee-breakup-box">
              <div class="fee-breakup-title">
                ${icon("receipt", 16)}
                <span>Fee Breakdown</span>
              </div>
              <div class="fee-breakup-grid">
                <div class="fee-item">
                  <span class="fee-label">Operator Service Fee</span>
                  <span class="fee-value highlight">Rs. 199</span>
                </div>
                <div class="fee-item">
                  <span class="fee-label">Govt / Portal Fee</span>
                  <span class="fee-value">Confirmed after review</span>
                </div>
                <div class="fee-item">
                  <span class="fee-label">Payment Mode</span>
                  <span class="fee-value">UPI / Card / Net Banking</span>
                </div>
              </div>
              <p class="fee-breakup-note">Govt or portal fee (if any) is separate and will be communicated before official submission.</p>
            </div>
            <div class="checkout-info-badge-box">
              <div class="checkout-security-badge secure-success">
                ${icon("lock", 20)}
                <div class="badge-text">
                  <strong>100% Encrypted</strong>
                  <span>Secured via Razorpay &amp; PhonePe</span>
                </div>
              </div>
              <div class="checkout-security-badge secure-warning">
                ${icon("shield-check", 20)}
                <div class="badge-text">
                  <strong>Operator Assisted</strong>
                  <span>One Point verified process</span>
                </div>
              </div>
            </div>
          </div>
          <label class="checkbox-field full premium-checkbox" style="margin-bottom: 20px;">
            <input type="checkbox" name="consent" required>
            <span class="consent-text">I agree to share required documents for service processing. Final approval depends on the official department and operator review.</span>
          </label>
          <div class="wizard-actions">
            <button type="button" class="btn btn-soft font-bold" onclick="goToStep(2)">
              ${icon("arrow-left", 16)} Back
            </button>
            <button class="btn btn-primary premium-submit-btn font-bold" type="submit">
              Submit for Review ${icon("arrow-right", 16)}
            </button>
          </div>
          <p class="submit-helper-text">Payment is collected only after operator confirms your request.</p>
          <div class="checkout-next-steps">
            <p class="checkout-next-steps-title">${icon("clock", 13)} What happens next</p>
            <p class="checkout-next-step">${icon("check-circle", 14)} Operator reviews your details within <strong>2–4 hours</strong></p>
            <p class="checkout-next-step">${icon("message-circle", 14)} You get a confirmation on WhatsApp with final fee &amp; document checklist</p>
            <p class="checkout-next-step">${icon("credit-card", 14)} Payment link is shared only after review — no surprise charges</p>
          </div>
        </div>
      </form>
          </div>
        </div>
      </div>
    </section>
  `;
  if (formSlot) {
    formSlot.insertAdjacentHTML("beforebegin", formHtml);
    formSlot.remove();
  } else {
    main.insertAdjacentHTML("beforeend", formHtml);
  }
  if (useDrawer) {
    document.body.insertAdjacentHTML("beforeend", '<div class="apply-drawer-backdrop" onclick="window.closeApplyDrawer()"></div>');
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") window.closeApplyDrawer?.(); });
    if (window.lucide) window.lucide.createIcons();
  }
}

function setupWizardNavigation() {
  window.goToStep = function(stepNum) {
    const activeStep = document.querySelector('.wizard-step-panel:not([style*="display: none"]):not([style*="display:none"])');
    if (activeStep) {
      const currentNum = parseInt(activeStep.id.replace("wizard-step-", ""), 10);
      if (stepNum > currentNum) {
        const inputs = activeStep.querySelectorAll("input, select, textarea");
        for (const input of inputs) {
          const condField = input.closest(".conditional-field");
          if (condField && !condField.classList.contains("show")) {
            continue;
          }
          if (!input.checkValidity()) {
            input.reportValidity();
            return;
          }
        }
      }
    }

    document.querySelectorAll(".wizard-step-panel").forEach((panel) => {
      panel.style.display = "none";
    });
    const nextPanel = document.getElementById(`wizard-step-${stepNum}`);
    if (nextPanel) nextPanel.style.display = "block";

    document.querySelectorAll(".checkout-progress-bar [data-wizard-step]").forEach((stepEl) => {
      const stepElNum = parseInt(stepEl.getAttribute("data-wizard-step"), 10);
      stepEl.classList.remove("active", "completed");
      const numEl = stepEl.querySelector(".step-num");
      if (stepElNum < stepNum) {
        stepEl.classList.add("completed");
        if (numEl) numEl.innerHTML = window.lucide ? icon("check", 14) : "✓";
      } else if (stepElNum === stepNum) {
        stepEl.classList.add("active");
        if (numEl) numEl.innerText = stepElNum;
      } else if (numEl) {
        numEl.innerText = stepElNum;
      }
    });

    document.querySelectorAll(".checkout-progress-bar [data-wizard-line]").forEach((lineEl) => {
      const lineElNum = parseInt(lineEl.getAttribute("data-wizard-line"), 10);
      lineEl.classList.toggle("active", lineElNum < stepNum);
    });

    if (window.lucide) window.lucide.createIcons();
    if (!isDrawerPage()) document.getElementById("apply-now")?.scrollIntoView({ behavior: "smooth" });
  };

  // Bind click event listeners to progress steps
  const progressSteps = document.querySelectorAll(".checkout-progress-bar [data-wizard-step]");
  progressSteps.forEach((stepEl) => {
    stepEl.style.cursor = "pointer";
    stepEl.addEventListener("click", () => {
      const stepNum = parseInt(stepEl.getAttribute("data-wizard-step"), 10);
      window.goToStep(stepNum);
    });
  });
}

function setupUnifiedApplyPage() {
  injectUnifiedApplyForm();
  setupWizardNavigation();

  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const requestedService = (params.get("service_name") || params.get("service") || defaultApplyServiceForPage() || "Service Request").trim();

  const category = inferApplyCategory(params.get("category") || "", requestedService);
  const serviceSelect = form.querySelector("#pan-service-type");
  if (serviceSelect) {
    const options = getScopedServiceOptions(category, requestedService);
    serviceSelect.innerHTML = options.map((service) => {
      if (service === "Select a Service") {
        return `<option value="">Select a Service</option>`;
      }
      return `<option value="${escapeOption(service)}">${escapeOption(service)}</option>`;
    }).join("");
    const defaultValue = options.includes(requestedService)
      ? requestedService
      : (options[0] === "Select a Service" ? "" : (options[0] || requestedService));
    serviceSelect.value = defaultValue;
  }

  // Build visual stype-cards for pages with defined card options
  const stypeCardsEl = form.querySelector("#stype-cards-inject");
  if (stypeCardsEl) {
    const cards = STYPE_CARDS_MAP[requestedService] || [];
    if (cards.length) {
      stypeCardsEl.innerHTML = cards.map((c, i) =>
        `<label class="stype-card${i === 0 ? " stype-selected" : ""}">` +
        `<input type="radio" name="stype_visual" value="${c.value.replace(/"/g, "&quot;")}"${i === 0 ? " checked" : ""}>` +
        `<span class="stype-icon"><i data-lucide="${c.icon}"></i></span>` +
        `<span class="stype-name">${c.label}</span>` +
        `<span class="stype-price">${c.price}</span>` +
        `</label>`
      ).join("");
      if (serviceSelect) {
        serviceSelect.innerHTML = cards.map(c =>
          `<option value="${c.value.replace(/"/g, "&quot;")}">${c.value}</option>`
        ).join("");
        serviceSelect.value = cards[0].value;
      }
      stypeCardsEl.addEventListener("change", (e) => {
        if (e.target.type !== "radio") return;
        stypeCardsEl.querySelectorAll(".stype-card").forEach(card =>
          card.classList.remove("stype-selected")
        );
        e.target.closest(".stype-card")?.classList.add("stype-selected");
        if (serviceSelect) serviceSelect.value = e.target.value;
        applySelectedService();
      });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function getServicePrice(nameVal) {
    const name = (nameVal || "").toLowerCase();
    if (name.includes("ayushman")) return 100;
    if (name.includes("voter")) return 100;
    if (name.includes("passport")) return 499;
    if (name.includes("income") || name.includes("caste") || name.includes("domicile") || name.includes("birth") || name.includes("police")) return 150;
    if (name.includes("gst")) return 499;
    if (name.includes("msme")) return 299;
    if (name.includes("digital signature") || name.includes("dsc")) return 999;
    if (name.includes("fssai")) return 499;
    if (name.includes("shop")) return 299;
    if (name.includes("iec")) return 499;
    if (name.includes("trademark")) return 999;
    if (name.includes("company")) return 1999;
    if (name.includes("exam")) return 199;
    return 199; // Default booking deposit fee
  }

  const applySelectedService = () => {
    const serviceName = serviceSelect?.value || requestedService;
    // Keep visual stype-cards in sync with hidden select (programmatic changes via drawer/restore/etc.)
    const _stypeEl = form.querySelector("#stype-cards-inject");
    if (_stypeEl && _stypeEl.children.length) {
      _stypeEl.querySelectorAll(".stype-card").forEach(card => {
        const radio = card.querySelector("input[type='radio']");
        const match = radio?.value === serviceName;
        card.classList.toggle("stype-selected", match);
        if (radio) radio.checked = match;
      });
    }
    const displayName = (!serviceName || serviceName === "Select a Service" || serviceName === "Service Request") ? "Service Request" : serviceName;
    const serviceSlug = isPanServiceLabel(serviceName) ? "pan-card" : slugify(serviceName);
    const profile = unifiedApplyProfile(serviceName, category);
    const needsPanDetails = serviceName === "PAN Correction" || serviceName === "Card Reprint";

    form.dataset.serviceSlug = serviceSlug;
    form.dataset.serviceName = serviceName;
    ensureHiddenInput(form, "service_slug").value = serviceSlug;
    ensureHiddenInput(form, "service_name").value = serviceName;

    const panNumberField = form.querySelector("#field-pan-number");
    const correctionField = form.querySelector("#field-correction-type");
    const existingPanInput = form.querySelector("#existing-pan-number");
    const correctionSelect = form.querySelector("#correction-type-select");
    panNumberField?.classList.toggle("show", needsPanDetails);
    existingPanInput?.toggleAttribute("required", needsPanDetails);
    correctionField?.classList.toggle("show", serviceName === "PAN Correction");
    correctionSelect?.toggleAttribute("required", serviceName === "PAN Correction");
    if (!needsPanDetails && existingPanInput) existingPanInput.value = "";
    if (serviceName !== "PAN Correction" && correctionSelect) correctionSelect.value = "";

    // Conditional Address Hiding for Digital Services
    const digitalServices = ["E-PAN Download", "Admit Card Download", "Result Download", "Resume Builder", "Online Test", "WhatsApp Support", "Call Support", "General Support"];
    const isDigital = digitalServices.includes(serviceName);
    const locationFieldIds = ["field-address", "field-pincode", "field-district", "field-state"];
    locationFieldIds.forEach((id) => {
      const fieldEl = form.querySelector(`#${id}`);
      if (fieldEl) {
        fieldEl.style.display = isDigital ? "none" : "";
        fieldEl.querySelectorAll("input, select").forEach((inp) => inp.toggleAttribute("required", !isDigital));
      }
    });
    const addressInput = form.querySelector("#pan-address");
    if (isDigital && addressInput) addressInput.value = "Digital Delivery";
    else if (!isDigital && addressInput?.value === "Digital Delivery") addressInput.value = "";

    const formHeaderTitle = document.querySelector("#apply-now .request-form-header h2");
    const formHeaderText = document.querySelector("#apply-now .request-form-header p:last-of-type");
    if (formHeaderTitle) {
      formHeaderTitle.innerHTML = displayName === "Service Request"
        ? 'Start Service <span class="h2-gold">Request</span>'
        : `Start ${displayName} <span class="h2-gold">Request</span>`;
    }
    if (formHeaderText) {
      formHeaderText.textContent = "Share details for operator review. Submitting will take you to the unified secure checkout portal.";
    }

    const firstGuidance = form.querySelector("#wizard-step-1 .service-guidance");
    if (firstGuidance) {
      firstGuidance.innerHTML = `
        <span class="service-guidance-icon">${icon("shield-check", 22)}</span>
        <div>
          <strong>Personal & Service Details</strong>
          <p>Provide your basic details and keep official documents ready for operator review.</p>
        </div>
      `;
    }

    const uploadGuidance = form.querySelector("#wizard-step-2 .service-guidance div");
    uploadGuidance?.querySelector("strong")?.replaceChildren(displayName === "Service Request" ? "Document Vault" : `${displayName} Document Vault`);
    uploadGuidance?.querySelector("p")?.replaceChildren(profile.upload);

    const uploadHelp = form.querySelector(".upload-status-footer .field-help");
    if (uploadHelp) uploadHelp.textContent = `Accepted: ${profile.docs} (Max 1MB/file, up to 10 files).`;

    const notes = form.querySelector("#pan-notes");
    if (notes) notes.placeholder = profile.placeholder;

    const consent = form.querySelector(".premium-checkbox span");
    if (consent) {
      consent.textContent = `I agree to share required documents for ${displayName === "Service Request" ? "service" : displayName} processing and understand that final approval depends on the official department.`;
    }

    const stickyTitle = document.querySelector(".sticky-cta-title");
    if (stickyTitle) {
      stickyTitle.textContent = displayName === "Service Request" ? "Apply Now" : `Apply ${displayName}`;
    }

    const feeNote = form.querySelector(".fee-breakup-box p");
    if (feeNote) {
      feeNote.textContent = isPanServiceLabel(serviceName)
        ? "Government portal fee is separate and charged additionally at official checkout depending on physical vs e-PAN selection."
        : "Government or portal fee, if any, is separate and confirmed before official submission.";
    }

    // Update Dynamic Pricing Elements
    const price = getServicePrice(serviceName);
    const feeValueEl = form.querySelector(".fee-breakup-grid .fee-item:first-child .fee-value");
    if (feeValueEl) {
      feeValueEl.textContent = `Rs. ${price}`;
    }
    const submitBtn = form.querySelector(".premium-submit-btn");
    if (submitBtn) {
      submitBtn.innerHTML = `Confirm &amp; Pay Rs. ${price} ${icon("arrow-right", 16)}`;
    }

    const railNameEl = document.getElementById("rail-service-name");
    if (railNameEl) railNameEl.textContent = displayName;
    const railPriceEl = document.getElementById("rail-service-price");
    if (railPriceEl) railPriceEl.textContent = `Rs. ${price}`;
    const drawerLabel = document.getElementById("drawer-header-label");
    if (drawerLabel) drawerLabel.textContent = displayName === "Service Request" ? "Start Request" : `${displayName} Request`;

    if (window.lucide) window.lucide.createIcons();
  };

  window._applySelectedService = applySelectedService;

  // ── Lead capture: Step 1 → Step 2 pe sheet mein row create karo
  const _origGoToStep = window.goToStep;
  window.goToStep = function(stepNum) {
    if (stepNum === 2 && !sessionStorage.getItem("opds_order_id")) {
      const nameVal  = form.querySelector("#pan-name")?.value?.trim()   || "";
      const mobileVal = form.querySelector("#pan-mobile")?.value?.trim() || "";
      const emailVal = form.querySelector("#pan-email")?.value?.trim()   || "";
      const svcVal   = serviceSelect?.value || "";
      if (nameVal && mobileVal.length === 10) {
        const oid = generateOrderId();
        sessionStorage.setItem("opds_order_id", oid);
        saveOrder({
          orderId: oid, isNewRecord: true,
          step: "lead", status: "New Lead",
          name: nameVal, mobile: mobileVal, email: emailVal, service: svcVal
        });
      }
    }
    _origGoToStep(stepNum);
  };

  serviceSelect?.addEventListener("change", applySelectedService);
  if (serviceSelect) {
    fetchWebsiteCatalog()
      .then((catalog) => {
        const dynamicOptions = getDynamicCatalogOptions(catalog, category, requestedService);
        if (!dynamicOptions.length) return;
        // Skip if stype-cards are managing service type selection for this page
        if (form.querySelector("#stype-cards-inject")?.children.length) return;
        const currentValue = serviceSelect.value || requestedService;
        serviceSelect.innerHTML = dynamicOptions.map((service) => {
          if (service === "Select a Service") {
            return `<option value="">Select a Service</option>`;
          }
          return `<option value="${escapeOption(service)}">${escapeOption(service)}</option>`;
        }).join("");
        const nextValue = dynamicOptions.includes(currentValue)
          ? currentValue
          : (dynamicOptions[0] === "Select a Service" ? "" : (dynamicOptions[0] || requestedService));
        serviceSelect.value = nextValue;
        applySelectedService();
      })
      .catch(() => {});
  }
  document.querySelectorAll(".btn-service-select[data-service]").forEach((button) => {
    button.addEventListener("click", (e) => {
      const svc = button.getAttribute("data-service") || "";
      if (isDrawerPage()) {
        e.stopPropagation();
        if (serviceSelect && svc) serviceSelect.value = svc;
        applySelectedService();
        window.openApplyDrawer(svc);
      } else {
        window.setTimeout(() => {
          if (serviceSelect) serviceSelect.value = svc || serviceSelect.value;
          applySelectedService();
        }, 0);
      }
    });
  });
  applySelectedService();

  if (isDrawerPage()) {
    document.querySelectorAll('[href="#apply-now"]').forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        window.openApplyDrawer();
      });
    });
    if (window.location.hash === "#apply-now") {
      setTimeout(() => window.openApplyDrawer(), 400);
    }
  } else if (window.location.hash === "#apply-now") {
    [120, 600, 1200].forEach((delay, index) => {
      window.setTimeout(() => {
        scrollToPageTarget(document.getElementById("apply-now"), index === 0 ? "auto" : "smooth");
      }, delay);
    });
  }
}

function setupApplyForms() {
  document.querySelectorAll("[data-apply-form]").forEach((form) => {
    form.setAttribute("novalidate", "true");
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      localStorage.removeItem('opds_abandoned_form_state');
      const mobile = form.querySelector('input[name="mobile"]');
      const digits = mobile?.value?.replace(/\D/g, "") || "";

      if (!form.checkValidity()) {
        const invalidInput = form.querySelector(":invalid");
        if (invalidInput) {
          const stepPanel = invalidInput.closest(".wizard-step-panel");
          if (stepPanel) {
            const stepNum = parseInt(stepPanel.id.replace("wizard-step-", ""), 10);
            if (typeof window.goToStep === "function") {
              window.goToStep(stepNum);
            }
            setTimeout(() => {
              invalidInput.reportValidity();
              invalidInput.focus();
            }, 100);
            return;
          }
        }
        form.reportValidity();
        return;
      }

      if (mobile && digits.length !== 10) {
        mobile.setCustomValidity("Please enter a valid 10-digit mobile number.");
        const stepPanel = mobile.closest(".wizard-step-panel");
        if (stepPanel) {
          const stepNum = parseInt(stepPanel.id.replace("wizard-step-", ""), 10);
          if (typeof window.goToStep === "function") {
            window.goToStep(stepNum);
          }
        }
        setTimeout(() => {
          mobile.reportValidity();
          mobile.focus();
          mobile.setCustomValidity("");
        }, 100);
        return;
      }

      const submit = form.querySelector('button[type="submit"]');
      const originalText = submit?.innerHTML || "Submit Request";
      const pmodeVal = (new FormData(form)).get("payment_mode") || "pay_after_review";
      const loadingLabel = pmodeVal === "pay_now" ? "Redirecting to Checkout…" : "Submitting Request…";
      if (submit) {
        submit.innerHTML = `<i data-lucide="loader-2" class="spin"></i> ${loadingLabel}`;
        submit.disabled = true;
        submit.style.opacity = ".8";
        if (window.lucide) window.lucide.createIcons();
      }

      form.querySelector("[data-service-payment-notice]")?.remove();
      const notice = document.createElement("div");
      notice.className = "auth-notice full auth-notice-testing";
      notice.setAttribute("role", "status");
      notice.setAttribute("data-service-payment-notice", "");
      notice.innerHTML = `<div class="testing-notice-head"><i data-lucide="check-circle-2" class="testing-icon"></i><div><strong>Request Verified</strong><span>Redirecting to unified secure checkout portal...</span></div></div>`;
      
      const targetContainer = form.querySelector(".wizard-step-panel:not([style*='display: none']):not([style*='display:none'])") || form.querySelector(".form-grid") || form;
      targetContainer.appendChild(notice);
      if (window.lucide) window.lucide.createIcons();

      const formData = new FormData(form);
      const serviceSlug = inferServiceSlug(form);
      const serviceName = encodeURIComponent(formData.get("service_name") || formData.get("service_type") || form.dataset.serviceName || serviceSlug);
      const name = encodeURIComponent(formData.get("name") || "");
      const phone = encodeURIComponent(formData.get("mobile") || "");
      const email = encodeURIComponent(formData.get("email") || "");
      const pincode = encodeURIComponent(formData.get("pincode") || "");
      const district = encodeURIComponent(formData.get("district") || "");
      const state = encodeURIComponent(formData.get("state") || "");
      const rawAddress = formData.get("address") || "";
      const fullAddress = [rawAddress, formData.get("district"), formData.get("state"), formData.get("pincode")].filter(Boolean).join(", ");
      const address = encodeURIComponent(fullAddress);
      const notes = encodeURIComponent(formData.get("notes") || formData.get("message") || formData.get("service_type") || "");

      // ── Firestore update: full data on final submit
      const orderId = sessionStorage.getItem("opds_order_id") || generateOrderId();
      sessionStorage.setItem("opds_order_id", orderId);
      const paymentMode = formData.get("payment_mode") || "pay_after_review";
      saveOrder({
        orderId,
        step: "submitted",
        status: paymentMode === "pay_now" ? "Form Submitted — Pay Now" : "Form Submitted — Pay After Review",
        name:     decodeURIComponent(formData.get("name")    || ""),
        mobile:   decodeURIComponent(formData.get("mobile")  || ""),
        email:    decodeURIComponent(formData.get("email")   || ""),
        service:  decodeURIComponent(formData.get("service_type") || formData.get("service_name") || ""),
        address:  rawAddress,
        pincode:  formData.get("pincode")  || "",
        district: formData.get("district") || "",
        state:    formData.get("state")    || "",
        notes:    decodeURIComponent(formData.get("notes") || ""),
        driveLink: formData.get("pan_google_drive_link") || "",
        paymentMode
      });
      const attachedFiles = (window.attachedFiles || []).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type || "file"
      }));
      const attachments = encodeURIComponent(JSON.stringify({
        driveLink: formData.get("pan_google_drive_link") || "",
        files: attachedFiles
      }));

      if (window.trackAnalyticsEvent) {
        window.trackAnalyticsEvent('apply_completed', {
          serviceSlug,
          serviceName: decodeURIComponent(serviceName),
          name: decodeURIComponent(name),
          phone: decodeURIComponent(phone),
          filesCount: attachedFiles.length
        });
      }

      if (paymentMode === "pay_now") {
        setTimeout(() => {
          window.location.href = `checkout.html?service=${serviceSlug}&service_name=${serviceName}&name=${name}&phone=${phone}&email=${email}&address=${address}&notes=${notes}&attachments=${attachments}`;
        }, 600);
      } else {
        setTimeout(() => {
          const applyForm = document.getElementById("pan-apply-form");
          const confirmScreen = document.getElementById("review-confirm-screen");
          if (applyForm) applyForm.style.display = "none";
          if (confirmScreen) {
            confirmScreen.style.display = "flex";
            if (window._showReviewConfirm) window._showReviewConfirm(orderId);
            if (window.lucide) window.lucide.createIcons();
          }
          const applySection = document.getElementById("apply-now");
          if (applySection) applySection.scrollIntoView({ behavior: "smooth" });
        }, 600);
      }
    });
  });
}

function setupPaymentFlow() {
  const paymentCards = document.querySelectorAll("[data-payment-flow]");
  if (!paymentCards.length) return;

  paymentCards.forEach(card => {
    const btnRazorpay = card.querySelector("[data-pay-btn='razorpay']");
    const btnUpi = card.querySelector("[data-pay-btn='upi']");
    const checkoutSteps = card.querySelector("[data-checkout-steps]");
    const steps = card.querySelectorAll(".checkout-step");
    const successArea = card.querySelector("[data-payment-success]");
    const upiQr = card.querySelector("[data-upi-qr]");
    const successMessage = card.querySelector("[data-success-message]");

    if (btnRazorpay && btnUpi) {
      btnUpi.addEventListener("click", () => {
        btnUpi.style.borderColor = "var(--accent)";
        btnUpi.style.color = "var(--accent)";
        btnRazorpay.style.borderColor = "";
        btnRazorpay.style.color = "";
        
        if(checkoutSteps) checkoutSteps.style.display = "none";
        if(successArea) successArea.style.display = "flex";
        
        if(upiQr) {
            upiQr.style.display = "block";
            upiQr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=support@bisenonepoint&pn=OnePointDigital&am=199&cu=INR" alt="UPI QR code for One Point Digital Services payment" style="width: 100%; height: 100%; object-fit: contain;">`;
        }
        if(successMessage) successMessage.style.display = "block";
      });

      btnRazorpay.addEventListener("click", () => {
        btnRazorpay.style.borderColor = "var(--accent)";
        btnRazorpay.style.color = "var(--accent)";
        btnUpi.style.borderColor = "";
        btnUpi.style.color = "";
        
        if(upiQr) upiQr.style.display = "none";
        if(successMessage) successMessage.style.display = "none";
        if(successArea) successArea.style.display = "none";
        if(checkoutSteps) checkoutSteps.style.display = "grid";
        
        let currentStep = 0;
        steps.forEach(s => {
            s.style.opacity = "0.4";
            const icon = s.querySelector('span');
            if(icon) {
                icon.style.background = "rgba(255, 255, 255, 0.15)";
                icon.innerHTML = s.getAttribute("data-step");
            }
        });
        
        const processNextStep = () => {
          if (currentStep < steps.length) {
            steps[currentStep].style.opacity = "1";
            const icon = steps[currentStep].querySelector('span');
            if (icon) {
                icon.style.background = "var(--success)";
                icon.innerHTML = window.lucide ? `<i data-lucide="check" style="width: 18px; height: 18px; color: #fff;"></i>` : "✓";
                if(window.lucide) window.lucide.createIcons();
            }
            currentStep++;
            setTimeout(processNextStep, 1000);
          } else {
            setTimeout(() => {
                if(successArea) successArea.style.display = "flex";
                if(successMessage) successMessage.style.display = "block";
            }, 500);
          }
        };
        
        processNextStep();
      });
    }
  });
}

function setupLucide() {
  if (window.lucide) {
    document.querySelectorAll("[data-lucide]").forEach((item) => item.setAttribute("aria-hidden", "true"));
    window.lucide.createIcons();
  }
}

function setupInternalComponentVisualContracts() {
  if (document.body?.id === "homepage-body") return;

  const clearInlineProps = (selector, props) => {
    document.querySelectorAll(selector).forEach((element) => {
      props.forEach((prop) => element.style.removeProperty(prop));
    });
  };

  clearInlineProps(".premium-service-hero .hero-video-overlay", [
    "background",
    "backdrop-filter",
    "-webkit-backdrop-filter"
  ]);

  clearInlineProps(".premium-service-hero .hero-video-bg", [
    "filter",
    "opacity"
  ]);

  clearInlineProps(".premium-service-hero .page-hero-title, section.premium-story-showcase .premium-headline", [
    "color",
    "background",
    "-webkit-text-fill-color",
    "white-space",
    "transition"
  ]);

  clearInlineProps(".premium-service-hero .page-hero-copy > p:not(.eyebrow):not(.section-kicker):not(.tag), section.premium-story-showcase .premium-subhead-new, section.premium-story-showcase .small-feature-desc, section.premium-story-showcase .large-card-desc", [
    "color",
    "opacity",
    "font-size",
    "font-weight",
    "font-family",
    "line-height",
    "margin",
    "margin-top",
    "margin-bottom",
    "max-width"
  ]);

  clearInlineProps(".section-kicker, .eyebrow, .premium-badge-pill, .tag, .price-tag, .hero-trust-badge, .status-live-badge, .cta-small-tag", [
    "color",
    "border",
    "border-color",
    "background",
    "padding",
    "margin",
    "margin-bottom",
    "margin-left",
    "margin-right",
    "border-radius",
    "height",
    "min-height",
    "font-size",
    "font-weight",
    "line-height",
    "letter-spacing",
    "text-transform",
    "box-shadow"
  ]);

  clearInlineProps("section.premium-story-showcase", [
    "background",
    "border-top"
  ]);

  clearInlineProps("section.premium-story-showcase .premium-header", [
    "align-items",
    "margin-bottom"
  ]);

  clearInlineProps("section.premium-story-showcase .premium-small-features-list, #related-services .services-carousel-track, #related-services .related-source-card-grid", [
    "display",
    "grid-template-columns",
    "gap",
    "align-items"
  ]);

  clearInlineProps("section.premium-story-showcase .small-feature-item, section.premium-story-showcase .edupoint-checklist-item", [
    "padding",
    "display",
    "align-content",
    "min-height",
    "gap",
    "border",
    "border-color",
    "background",
    "box-shadow",
    "border-radius"
  ]);

  clearInlineProps(".service-icon, .feature-icon, .small-feature-icon, .large-card-icon, .faq-support-icon, .step-icon, .process-step-icon, .ci-card-icon, .doc-icon, .trust-icon, .review-icon, .store-product-icon", [
    "width",
    "height",
    "display",
    "align-items",
    "justify-content",
    "place-items",
    "color",
    "background",
    "border",
    "border-color",
    "border-radius",
    "box-shadow"
  ]);

  clearInlineProps("section.premium-story-showcase .metric-val-glass, section.premium-story-showcase .metric-label-glass, section.premium-story-showcase .cta-link-secondary, section.premium-story-showcase .btn-premium-gold", [
    "color",
    "white-space",
    "background",
    "border-color"
  ]);

  document.querySelectorAll("section.premium-story-showcase .premium-headline").forEach((element) => {
    element.removeAttribute("onmouseover");
    element.removeAttribute("onmouseout");
  });
}

window.saveCloudLink = function(btn) {
  const input = btn.previousElementSibling;
  if (!input || !input.value.trim()) {
    if (input) {
      input.focus();
      input.reportValidity();
    }
    return;
  }
  btn.classList.add("saved");
  btn.innerHTML = window.lucide ? `<i data-lucide="check" style="width: 16px; height: 16px;"></i> Saved` : "✓ Saved";
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    btn.classList.remove("saved");
    btn.innerHTML = "Save";
  }, 3500);
};

window.syncGoogleDrive = function() {
  alert("🔗 Redirecting to your Google Drive...\nPlease copy the shared link of your document and paste it in the Google Drive box below.");
  window.open("https://drive.google.com", "_blank");
};

window.compressImage = function(file, maxSizeBytes, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement("canvas");
      let width = img.width;
      let height = img.height;
      
      const maxDim = 1600;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      
      let quality = 0.75;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);
      
      function dataURLtoFile(dataurl, filename) {
        const arr = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
      }
      
      let compressedFile = dataURLtoFile(dataUrl, file.name);
      
      if (compressedFile.size > maxSizeBytes) {
        quality = 0.5;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
        compressedFile = dataURLtoFile(dataUrl, file.name);
      }
      
      callback(compressedFile);
    };
    img.onerror = function() {
      callback(null);
    };
    img.src = e.target.result;
  };
  reader.onerror = function() {
    callback(null);
  };
  reader.readAsDataURL(file);
};

window.handleDeviceUpload = async function(input) {
  if (!input.files || !input.files.length) return;
  
  window.attachedFiles = window.attachedFiles || [];
  const maxFiles = 10;
  const maxSizeBytes = 1024 * 1024; // 1 MB
  
  let oversizedFiles = [];
  const fileArray = Array.from(input.files);
  input.value = "";
  
  for (const file of fileArray) {
    if (window.attachedFiles.length >= maxFiles) {
      alert("Maximum limit of 10 files reached.");
      break;
    }
    
    if (file.size <= maxSizeBytes) {
      if (!window.attachedFiles.some(f => f.name === file.name)) {
        window.attachedFiles.push(file);
      }
    } else if (file.type && file.type.startsWith("image/")) {
      const container = document.getElementById("attachment-file-list");
      if (container) {
        container.style.display = "flex";
        let statusEl = document.getElementById("upload-compress-spinner");
        if (!statusEl) {
          statusEl = document.createElement("div");
          statusEl.id = "upload-compress-spinner";
          statusEl.className = "attached-file-item glass-panel";
          statusEl.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.9); border: 1px solid rgba(18,86,150,0.15); color: var(--primary);";
          statusEl.innerHTML = `<i data-lucide="loader-2" class="spin" style="width: 18px; height: 18px;"></i> <span class="text-sm">Compressing large photo: ${file.name}...</span>`;
          container.appendChild(statusEl);
          if (window.lucide) window.lucide.createIcons();
        }
      }
      
      const compressed = await new Promise(resolve => {
        window.compressImage(file, maxSizeBytes, resolve);
      });
      
      document.getElementById("upload-compress-spinner")?.remove();
      
      if (compressed && compressed.size <= maxSizeBytes) {
        if (!window.attachedFiles.some(f => f.name === compressed.name)) {
          window.attachedFiles.push(compressed);
        }
      } else {
        oversizedFiles.push(file);
      }
    } else {
      oversizedFiles.push(file);
    }
    window.renderAttachmentList();
  }
  
  if (oversizedFiles.length > 0) {
    window.showCompressorAlert(oversizedFiles);
  }
};

window.renderAttachmentList = function() {
  const container = document.getElementById("attachment-file-list");
  if (!container) return;
  
  window.attachedFiles = window.attachedFiles || [];
  
  if (window.attachedFiles.length === 0) {
    container.innerHTML = "";
    container.style.display = "none";
    return;
  }
  
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";
  container.style.marginTop = "12px";
  
  let html = `<div class="attachment-list-title" class="text-sm font-bold" style="color: var(--ink); display: flex; justify-content: space-between; align-items: center;">
    <span>Attached Files (${window.attachedFiles.length}/10)</span>
    <span class="text-xs" style="color: var(--primary);">Max 1MB/file</span>
  </div>`;
  
  window.attachedFiles.forEach((file, index) => {
    const sizeKb = (file.size / 1024).toFixed(1);
    html += `
      <div class="attached-file-item glass-panel" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; border-radius: 12px; background: rgba(255,255,255,0.9); border: 1px solid rgba(18,86,150,0.15); box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <i data-lucide="file-check" style="color: var(--success); width: 18px; height: 18px; flex-shrink: 0;"></i>
          <span class="text-sm font-semibold" style="color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
          <span class="text-xs" style="color: var(--muted); flex-shrink: 0;">(${sizeKb} KB)</span>
        </div>
        <button type="button" class="btn-remove-file" onclick="window.removeAttachedFile(${index})" style="background: none; border: none; color: var(--error); cursor: pointer; padding: 4px; display: grid; place-items: center; border-radius: 6px;" title="Remove file">
          <i data-lucide="x" style="width: 16px; height: 16px;"></i>
        </button>
      </div>
    `;
  });
  
  container.innerHTML = html;
  if (window.lucide) window.lucide.createIcons();
};

window.removeAttachedFile = function(index) {
  if (window.attachedFiles && window.attachedFiles[index]) {
    window.attachedFiles.splice(index, 1);
    window.renderAttachmentList();
  }
};

window.showCompressorAlert = function(files) {
  let fileNames = files.map(f => `${f.name} (${(f.size/(1024*1024)).toFixed(2)} MB)`).join(", ");
  
  let modal = document.getElementById("compressor-alert-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "compressor-alert-modal";
    modal.className = "custom-modal-overlay";
    modal.innerHTML = `
      <div class="custom-modal-box glass-panel premium-modal-box">
        <div class="modal-header" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 38px; height: 38px; border-radius: 12px; background: #fee2e2; color: #dc2626; display: grid; place-items: center;">
              <i data-lucide="alert-triangle"></i>
            </div>
            <h3 class="text-lg font-extrabold" style="margin: 0; color: var(--ink);">File Size Exceeded (Max 1 MB)</h3>
          </div>
          <button type="button" onclick="window.closeCompressorAlert()" style="background: none; border: none; cursor: pointer; color: var(--muted); padding: 4px;">
            <i data-lucide="x" style="width: 20px; height: 20px;"></i>
          </button>
        </div>
        <div class="modal-body text-sm leading-normal" style="color: var(--muted); margin-bottom: 24px;">
          <p style="margin-top: 0;">The following files exceed the maximum allowed size of 1 MB:</p>
          <div id="oversized-files-list" class="font-semibold" style="padding: 10px 14px; background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.2); border-radius: 12px; color: #b91c1c; margin: 12px 0; word-break: break-all;"></div>
          <p style="margin-bottom: 0;">Please compress your files using our dedicated File Compressor & Converter Web App before uploading.</p>
        </div>
        <div class="modal-footer" style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button type="button" class="btn btn-primary full" onclick="window.openCompressorApp()">
            <i data-lucide="external-link"></i> Open File Compressor & Converter App
          </button>
          <button type="button" class="btn btn-soft full" onclick="window.closeCompressorAlert()">
            Close Alert
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  document.getElementById("oversized-files-list").innerText = fileNames;
  modal.style.display = "flex";
  if (window.lucide) window.lucide.createIcons();
};

window.closeCompressorAlert = function() {
  const modal = document.getElementById("compressor-alert-modal");
  if (modal) modal.style.display = "none";
};

window.openCompressorApp = function() {
  alert("🚀 Redirecting to One Point File Compressor & Converter Web App...\n(Link will be configured by operator)");
  window.open("https://compressor.bisenonepoint.com", "_blank");
};

function setupDynamicQuickServices() {
  const grid = document.querySelector("[data-quick-services-grid]");
  if (!grid) return;

  const fixedServices = [
    {
      title: "PAN Card",
      tag: "2-3 days",
      price: "₹199",
      category: "government",
      popular: true,
      accent: "#d2a12a",
      icon: "id-card",
      desc: "New PAN, correction support, document upload and secure UPI checkout.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("PAN Card", "e-services"), primary: true },
        { label: "Track", href: "track-application.html", ghost: true }
      ]
    },
    {
      title: "Ayushman Card",
      tag: "Same day",
      price: "₹100",
      category: "government",
      popular: true,
      accent: "#125696",
      icon: "heart-pulse",
      desc: "Eligibility check, document support and guided local processing.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Ayushman Card", "e-services"), primary: true }
      ]
    },
    {
      title: "GST Registration",
      tag: "1-2 days",
      price: "₹999",
      category: "business",
      popular: true,
      accent: "#d2a12a",
      icon: "file-stack",
      desc: "Business details, document checklist, application flow and consultant review.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("GST Registration", "proserve"), primary: true }
      ]
    }
  ];

  const rotatingPool = [
    {
      title: "Resume Builder",
      tag: "30 min",
      price: "₹149",
      category: "student",
      popular: false,
      accent: "#125696",
      icon: "file-user",
      desc: "Student-friendly resumes for jobs, internships and skill course applications.",
      actions: [
        { label: "Build", href: "edupoint.html#resume", primary: true }
      ]
    },
    {
      title: "Admit Card Download",
      tag: "Instant",
      price: "₹50",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "download",
      desc: "Download and print exam admit cards for railway, police, SSC and university tests.",
      actions: [
        { label: "Download", href: "edupoint.html#admit-card-download", primary: true }
      ]
    },
    {
      title: "Caste Certificate",
      tag: "2-3 days",
      price: "₹150",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "file-text",
      desc: "Official jati praman patra application and assistance for SC, ST, and OBC candidates.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Caste Certificate", "e-services"), primary: true }
      ]
    },
    {
      title: "Domicile Certificate",
      tag: "2-3 days",
      price: "₹150",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "home",
      desc: "Official niwas praman patra residency proof registration and document verification.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Domicile Certificate", "e-services"), primary: true }
      ]
    },
    {
      title: "Birth Certificate",
      tag: "Same day",
      price: "₹150",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "baby",
      desc: "Newborn birth certificate application support and corrected records printing.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Birth Certificate", "e-services"), primary: true }
      ]
    },
    {
      title: "Passport Assistance",
      tag: "Support",
      price: "₹1500",
      category: "travel",
      popular: true,
      accent: "#125696",
      icon: "plane",
      desc: "Form guidance, appointment support and required document preparation.",
      actions: [
        { label: "Start", href: serviceApplyHref("Passport Assistance", "e-services"), primary: true }
      ]
    },
    {
      title: "Travel Booking",
      tag: "Travel",
      price: "Best Price",
      category: "travel",
      popular: true,
      accent: "#d2a12a",
      icon: "bus",
      desc: "Bus, train, flight, hotel and tour support from the local helpdesk.",
      actions: [
        { label: "Book", href: serviceApplyHref("Travel Booking", "travel"), primary: true }
      ]
    },
    {
      title: "Voter ID",
      tag: "1-2 days",
      price: "₹100",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "vote",
      desc: "New voter ID application, correction, address change and status tracking.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Voter ID", "e-services"), primary: true }
      ]
    },
    {
      title: "Income Certificate",
      tag: "Same day",
      price: "₹150",
      category: "government",
      popular: true,
      accent: "#d2a12a",
      icon: "indian-rupee",
      desc: "Official income certificate for scholarship, admissions and government schemes.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Income Certificate", "e-services"), primary: true }
      ]
    },
    {
      title: "MSME Registration",
      tag: "Instant",
      price: "₹499",
      category: "business",
      popular: false,
      accent: "#d2a12a",
      icon: "factory",
      desc: "Udyam registration certificate for small businesses, tenders and bank loans.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("MSME Registration", "proserve"), primary: true }
      ]
    },
    {
      title: "Exam Form Filling",
      tag: "Support",
      price: "₹200",
      category: "student",
      popular: true,
      accent: "#125696",
      icon: "file-text",
      desc: "Assisted online form filling for SSC, UPSC, Railway, Police and state exams.",
      actions: [
        { label: "Apply Now", href: routeForService("Exam Form Filling"), primary: true }
      ]
    },
    {
      title: "Police Verification",
      tag: "3-5 days",
      price: "₹250",
      category: "government",
      popular: false,
      accent: "#125696",
      icon: "shield",
      desc: "Character certificate and police verification for jobs, contracts and licenses.",
      actions: [
        { label: "Quick Apply", href: serviceApplyHref("Police Verification", "e-services"), primary: true }
      ]
    }
  ];

  // Combine fixed and rotating services into one pool so we have all of them to scroll/rotate through
  window.currentQuickServices = [...fixedServices, ...rotatingPool];

  let currentIndex = 0;
  let autoRotateInterval = null;
  let currentFilteredList = [];

  function getVisibleCards() {
    if (window.innerWidth <= 700) return 1;
    if (window.innerWidth <= 992) return 2;
    return 4;
  }

  function updateCarousel() {
    const visible = getVisibleCards();
    const maxIndex = Math.max(0, currentFilteredList.length - visible);
    
    // Ensure boundary check
    if (currentIndex > maxIndex) {
      currentIndex = maxIndex;
    }
    if (currentIndex < 0) {
      currentIndex = 0;
    }

    const cards = [...grid.children];
    const gap = 22;
    const basis = visible === 1 ? "100%" : `calc((100% - ${(visible - 1) * gap}px) / ${visible})`;

    grid.style.setProperty("--carousel-card-size", basis);
    grid.style.transform = "none";
    grid.style.width = "100%";

    cards.forEach((card, index) => {
      card.hidden = !(index >= currentIndex && index < currentIndex + visible);
    });

    const btnPrev = document.querySelector("[data-carousel-prev]");
    const btnNext = document.querySelector("[data-carousel-next]");
    
    if (btnPrev) {
      btnPrev.style.opacity = currentIndex === 0 ? "0.3" : "1";
      btnPrev.style.pointerEvents = currentIndex === 0 ? "none" : "auto";
    }
    if (btnNext) {
      btnNext.style.opacity = currentIndex >= maxIndex ? "0.3" : "1";
      btnNext.style.pointerEvents = currentIndex >= maxIndex ? "none" : "auto";
    }
  }

  function startAutoRotate() {
    stopAutoRotate();
    autoRotateInterval = setInterval(() => {
      const visible = getVisibleCards();
      const maxIndex = Math.max(0, currentFilteredList.length - visible);
      if (maxIndex <= 0) return;

      if (currentIndex >= maxIndex) {
        currentIndex = 0; // Wrap around to start
      } else {
        currentIndex++;
      }
      updateCarousel();
    }, 4500);
  }

  // Mobile swipe gestures
  let touchStartX = 0;
  let touchEndX = 0;

  grid.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  grid.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
  }, { passive: true });

  function handleSwipe() {
    const swipeThreshold = 50; // minimum swipe distance in px
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) < swipeThreshold) return;
    
    stopAutoRotate();
    const visible = getVisibleCards();
    const maxIndex = Math.max(0, currentFilteredList.length - visible);
    
    if (diff > 0) {
      // Swiped left, go next
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
    } else {
      // Swiped right, go prev
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
    }
    startAutoRotate();
  }

  function stopAutoRotate() {
    if (autoRotateInterval) {
      clearInterval(autoRotateInterval);
      autoRotateInterval = null;
    }
  }

  function renderGrid(filter = "all") {
    currentFilteredList = window.currentQuickServices.filter(service => {
      if (filter === "all") return true;
      if (filter === "popular") return service.popular;
      return service.category === filter;
    });

    if (currentFilteredList.length === 0) {
      grid.innerHTML = `<p class="text-center text-lg" style="grid-column: 1/-1; padding: 48px; color: var(--muted);">No services found in this category.</p>`;
      return;
    }

    grid.innerHTML = currentFilteredList.map(service => `
      <article class="service-card glass-panel" style="--accent:${service.accent}">
        <div>
          <div class="service-top" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 16px;">
            <span class="service-icon"><i data-lucide="${service.icon}"></i></span>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end;">
              <span class="tag">${service.tag}</span>
              <span class="tag price-tag" style="background: #C9921A; color: #ffffff; border: none; box-shadow: none;">${service.price}</span>
            </div>
          </div>
          <h3 class="text-xl font-extrabold" style="color: var(--ink); margin-bottom: 8px;">${service.title}</h3>
          <p class="text-sm leading-normal" style="color: var(--muted); margin-bottom: 24px;">${service.desc}</p>
        </div>
        <div class="card-actions" style="display: flex; gap: 10px; margin-top: auto;">
          ${service.actions.map(act => `<a class="btn ${act.primary ? 'btn-primary' : 'btn-ghost'}" href="${act.href}">${act.label}</a>`).join("")}
        </div>
      </article>
    `).join("");

    if (window.lucide) window.lucide.createIcons();
    setupServiceCtas();
    
    // Reset carousel index and trigger animations/offsets
    currentIndex = 0;
    grid.style.transform = "translateX(0px)";
    
    setTimeout(() => {
      updateCarousel();
      startAutoRotate();
    }, 100);
  }

  // Setup navigation click events
  const btnPrev = document.querySelector("[data-carousel-prev]");
  const btnNext = document.querySelector("[data-carousel-next]");

  if (btnPrev) {
    btnPrev.addEventListener("click", () => {
      stopAutoRotate();
      if (currentIndex > 0) {
        currentIndex--;
        updateCarousel();
      }
      startAutoRotate();
    });
  }

  if (btnNext) {
    btnNext.addEventListener("click", () => {
      stopAutoRotate();
      const visible = getVisibleCards();
      const maxIndex = Math.max(0, currentFilteredList.length - visible);
      if (currentIndex < maxIndex) {
        currentIndex++;
        updateCarousel();
      }
      startAutoRotate();
    });
  }

  // Handle Resize and Orientation changes
  window.addEventListener("resize", () => {
    updateCarousel();
  });

  renderGrid("all");

  const filterButtons = document.querySelectorAll("[data-service-filters] button");
  filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      filterButtons.forEach(b => b.className = "btn btn-ghost");
      btn.className = "btn btn-soft active";
      renderGrid(btn.getAttribute("data-filter"));
    });
  });
}

function setupMegaMenuTabs() {
  const containers = document.querySelectorAll(".onemart-mega");
  if (!containers.length) return;

  containers.forEach((container) => {
    const sidebarItems = container.querySelectorAll(".mega-sidebar-item");
    const contentPanel = container.querySelector(".mega-content-panel");
    if (!sidebarItems.length || !contentPanel) return;

    function closeParentMenu() {
      const parentItem = container.closest(".nav-item");
      if (!parentItem) return;
      parentItem.classList.remove("open", "dropdown-open");
      const trigger = parentItem.querySelector("[data-dropdown-trigger]");
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    }

    function navigateMenuLink(link, event) {
      const href = link.getAttribute("href");
      if (!href || href === "#") return;

      event?.preventDefault();
      event?.stopPropagation();

      try {
        const currentUrl = new URL(window.location.href);
        const targetUrl = new URL(href, window.location.href);

        if (link.getAttribute("target") === "_blank") {
          window.open(targetUrl.toString(), "_blank");
          return;
        }

        const isSamePageHash = currentUrl.origin === targetUrl.origin &&
                               currentUrl.pathname === targetUrl.pathname &&
                               targetUrl.hash !== "";

        closeParentMenu();

        if (isSamePageHash) {
          if (window.location.hash !== targetUrl.hash) {
            window.location.hash = targetUrl.hash;
          }

          const target = document.getElementById(decodeURIComponent(targetUrl.hash.slice(1)));
          if (target) {
            window.setTimeout(() => scrollToPageTarget(target, "smooth"), 0);
          }
          return;
        }

        window.location.href = targetUrl.toString();
      } catch (e) {
        closeParentMenu();
        if (link.getAttribute("target") === "_blank") {
          window.open(href, "_blank");
        } else {
          window.location.href = href;
        }
      }
    }

    // Helper to bind right content panel links directly to prevent event conflicts
    function bindContentPanelLinks() {
      const links = contentPanel.querySelectorAll("a");
      links.forEach(link => {
        link.addEventListener("click", (event) => navigateMenuLink(link, event));
      });
    }

    // Helper to render right panel content
    function renderRightPanelContent(group) {
      const gridHtml = group.items.map(([label, href, desc, iconName]) => `
      <a class="mega-grid-item" href="${href}">
        <div class="mega-grid-item-icon">
          ${icon(iconName || 'file-text', 18)}
        </div>
        <div class="mega-grid-item-content">
          <h4 class="mega-grid-item-title">${label}</h4>
          <p class="mega-grid-item-desc">${desc || 'Access online application and support services.'}</p>
        </div>
      </a>
    `).join("");

      const arrowIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>`;

      return `
      <div class="mega-content-header">
        <h3 class="mega-content-title">${group.title}</h3>
        <p class="mega-content-desc">${group.desc}</p>
        <a class="mega-browse-link" href="${group.href}">Browse all ${group.title} ${arrowIcon}</a>
      </div>
      <div class="mega-items-grid">
        ${gridHtml}
      </div>
    `;
    }

    // Active switching function
    function setActiveCategory(index) {
      sidebarItems.forEach((item, idx) => {
        if (idx === parseInt(index)) {
          item.classList.add("active");
        } else {
          item.classList.remove("active");
        }
      });

      const group = servicesMegaGroups[index];
      if (group) {
        contentPanel.style.opacity = "0";
        setTimeout(() => {
          contentPanel.innerHTML = renderRightPanelContent(group);
          contentPanel.style.opacity = "1";
          if (typeof lucide !== "undefined") {
            lucide.createIcons();
          }
          bindContentPanelLinks();
        }, 70);
      }
    }

    // Add event listeners for hover and click
    sidebarItems.forEach(item => {
      item.addEventListener("pointerenter", () => {
        const idx = item.getAttribute("data-sidebar-idx");
        setActiveCategory(idx);
      });

      item.addEventListener("click", (event) => {
        const idx = item.getAttribute("data-sidebar-idx");
        setActiveCategory(idx);
        navigateMenuLink(item, event);
      });
    });

    // Reset to first category when dropdown opens
    const parentNavItem = container.closest(".nav-item");
    if (parentNavItem) {
      let wasOpen = parentNavItem.classList.contains("dropdown-open") || parentNavItem.classList.contains("open");
      const resetObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === "attributes" && mutation.attributeName === "class") {
            const isOpen = parentNavItem.classList.contains("dropdown-open") || parentNavItem.classList.contains("open");
            if (isOpen !== wasOpen) {
              wasOpen = isOpen;
              if (isOpen) {
                setActiveCategory(0);
              }
            }
          }
        });
      });
      resetObserver.observe(parentNavItem, { attributes: true });
    }

    // Bind initial links
    bindContentPanelLinks();
  });
}

redirectLegacyServiceContact();
renderNav();
renderFooter();
renderOneMartCatalog();
renderProductDetail();
setupMobileNav();
setupDropdowns();
setupMegaMenuTabs();
setupHeaderScroll();
setupServiceHeroDynamics();
setupHeroWords();
setupTracker();
setupFaqs();
setupSearch();
setupServiceCtas();
setupProductCarousel();
setupEduPointServiceCarousel();
setupImageLoading();
setupGallery();
setupTabs();
setupRequiredDocumentsTabs();
setupReveal();
setupActiveMobileNav();
setupContactForm();
setupUnifiedApplyPage();
setupApplyForms();
setupPaymentFlow();
setupOneMartInteractions();
setupDeferredHashTargeting();
setupDynamicQuickServices();
setupBentoSwitcher();
setupProcessStepper();
setupTrustCounters();
setupLiveActivityFeed();
setupReviewAvatarSafeguards();
injectConversionFaqs();
setupWhatsAppPrefills();
setupFormAbandonmentRecovery();
setupInternalComponentVisualContracts();
setupLucide();


function setupBentoSwitcher() {
  const slides = document.querySelectorAll(".comparison-step-slide");
  const stepperBtns = document.querySelectorAll(".bento-stepper-btn");
  if (slides.length === 0) return;

  let slideIndex = 0;
  let autoplayTimer = null;
  let progressTimer = null;
  const slideDuration = 5000; // 5 seconds per slide for better readability
  const updateInterval = 30; // update progress bar every 30ms
  let progressElapsed = 0;
  let paymentSuccessTimeout = null;

  function showSlide(index) {
    slideIndex = index;
    
    // Clear any active payment timeouts
    if (paymentSuccessTimeout) {
      clearTimeout(paymentSuccessTimeout);
      paymentSuccessTimeout = null;
    }

    slides.forEach((slide, idx) => {
      if (idx === index) {
        slide.classList.add("active");
        slide.classList.remove("payment-done");
        
        // Simulating interactive payment success on Step 01
        if (index === 0) {
          paymentSuccessTimeout = setTimeout(() => {
            slide.classList.add("payment-done");
          }, 2200); // Trigger checkmark overlay after 2.2s
        }
      } else {
        slide.classList.remove("active", "payment-done");
      }
    });

    stepperBtns.forEach((btn, idx) => {
      if (idx === index) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
        const fill = btn.querySelector(".stepper-tab-progress-fill");
        if (fill) fill.style.width = "0%";
      }
    });
  }

  function startAutoplay() {
    stopAutoplay();
    progressElapsed = 0;

    progressTimer = setInterval(() => {
      progressElapsed += updateInterval;
      const progressPercent = Math.min((progressElapsed / slideDuration) * 100, 100);
      
      const activeBtn = stepperBtns[slideIndex];
      if (activeBtn) {
        const fill = activeBtn.querySelector(".stepper-tab-progress-fill");
        if (fill) fill.style.width = progressPercent + "%";
      }

      if (progressElapsed >= slideDuration) {
        progressElapsed = 0;
        const nextIndex = (slideIndex + 1) % slides.length;
        showSlide(nextIndex);
      }
    }, updateInterval);
  }

  function stopAutoplay() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    stepperBtns.forEach(btn => {
      const fill = btn.querySelector(".stepper-tab-progress-fill");
      if (fill) fill.style.width = "0%";
    });
    if (paymentSuccessTimeout) {
      clearTimeout(paymentSuccessTimeout);
      paymentSuccessTimeout = null;
    }
  }

  // Interactive Click Handlers for Stepper Tabs
  stepperBtns.forEach((btn, idx) => {
    btn.addEventListener("click", () => {
      showSlide(idx);
      startAutoplay(); // Reset progress and start 5s rotation from this clicked slide
    });
  });

  // Initialize
  showSlide(0);
  startAutoplay();
}



// WhatsApp Float Button
(function renderWhatsAppButton() {
  const btn = document.createElement("a");
  btn.href = siteConfig.whatsapp;
  btn.target = "_blank";
  btn.rel = "noopener noreferrer";
  btn.setAttribute("aria-label", "Chat on WhatsApp");
  btn.className = "whatsapp-float";
  btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="28" height="28"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg><span>WhatsApp</span>`;
  document.body.appendChild(btn);
})();

function setupProcessStepper() {
  const navCards = document.querySelectorAll(".stepper-nav-card");
  const panes = document.querySelectorAll(".showcase-pane");
  if (navCards.length === 0 || panes.length === 0) return;

  let currentStep = 0;
  let autoplayInterval = null;
  let paneAnimIntervals = {};
  let textTypingTimeout = null;

  function clearAllAnimations() {
    if (textTypingTimeout) clearTimeout(textTypingTimeout);
    
    for (let key in paneAnimIntervals) {
      if (paneAnimIntervals[key]) {
        clearInterval(paneAnimIntervals[key]);
        clearTimeout(paneAnimIntervals[key]);
      }
    }
    paneAnimIntervals = {};

    const searchInput = document.querySelector(".typing-text-element");
    if (searchInput) searchInput.textContent = "";
    
    const resultCard = document.querySelector(".portal-result-card.pan-card-correction");
    if (resultCard) {
      resultCard.classList.remove("visible-card");
      resultCard.classList.remove("clicked");
    }
    
    const pointer = document.querySelector(".simulated-pointer");
    if (pointer) {
      pointer.style.transform = "translate(0, 0)";
      pointer.style.opacity = "0";
    }

    const rows = document.querySelectorAll(".uploaded-file-row");
    rows.forEach(row => {
      row.classList.remove("done");
      const bar = row.querySelector(".file-progress-bar");
      if (bar) bar.style.width = "0%";
      const pct = row.querySelector(".file-percentage");
      if (pct) pct.textContent = "0%";
    });

    const upiBody = document.querySelector(".upi-phone-body");
    if (upiBody) {
      upiBody.classList.remove("success");
    }

    const bubbles = document.querySelectorAll(".wa-bubble");
    bubbles.forEach(bubble => {
      bubble.classList.remove("show-msg");
    });
  }

  function triggerPaneAnimation(index) {
    clearAllAnimations();

    if (index === 0) {
      const text = "PAN Card correction";
      const targetEl = document.querySelector(".typing-text-element");
      const resultCard = document.querySelector(".portal-result-card.pan-card-correction");
      const pointer = document.querySelector(".simulated-pointer");
      
      let charIdx = 0;
      if (targetEl) {
        pointer.style.opacity = "1";
        
        function typeChar() {
          if (charIdx < text.length) {
            targetEl.textContent += text.charAt(charIdx);
            charIdx++;
            textTypingTimeout = setTimeout(typeChar, 80);
          } else {
            if (resultCard) {
              resultCard.classList.add("visible-card");
            }
            paneAnimIntervals["p0_pointer"] = setTimeout(() => {
              if (pointer) {
                pointer.style.transform = "translate(-180px, -110px)";
              }
              
              paneAnimIntervals["p0_click"] = setTimeout(() => {
                if (resultCard) {
                  resultCard.classList.add("clicked");
                }
                
                paneAnimIntervals["p0_hide"] = setTimeout(() => {
                  if (pointer) pointer.style.opacity = "0";
                }, 600);
              }, 1200);
            }, 600);
          }
        }
        
        paneAnimIntervals["p0_type"] = setTimeout(typeChar, 400);
      }
    } else if (index === 1) {
      const file1 = document.querySelector(".uploaded-file-row.file-1");
      const file2 = document.querySelector(".uploaded-file-row.file-2");
      
      function animateUpload(row, duration, delay, nextCallback) {
        paneAnimIntervals[row.classList[1] + "_anim"] = setTimeout(() => {
          const bar = row.querySelector(".file-progress-bar");
          const pct = row.querySelector(".file-percentage");
          let progress = 0;
          
          const stepTime = duration / 20;
          const interval = setInterval(() => {
            progress += 5;
            if (progress <= 100) {
              if (bar) bar.style.width = progress + "%";
              if (pct) pct.textContent = progress + "%";
            } else {
              clearInterval(interval);
              row.classList.add("done");
              if (nextCallback) nextCallback();
            }
          }, stepTime);
          
          paneAnimIntervals[row.classList[1] + "_int"] = interval;
        }, delay);
      }
      
      if (file1) animateUpload(file1, 1000, 200, () => {
        if (file2) animateUpload(file2, 1200, 200);
      });
    } else if (index === 2) {
      const upiBody = document.querySelector(".upi-phone-body");
      if (upiBody) {
        paneAnimIntervals["p2_pay"] = setTimeout(() => {
          upiBody.classList.add("success");
        }, 2200);
      }
    } else if (index === 3) {
      const bubbles = document.querySelectorAll(".wa-bubble");
      bubbles.forEach((bubble, idx) => {
        paneAnimIntervals["p3_msg_" + idx] = setTimeout(() => {
          bubble.classList.add("show-msg");
          const chatBody = document.querySelector(".wa-chat-body");
          if (chatBody) {
            chatBody.scrollTop = chatBody.scrollHeight;
          }
        }, idx * 1200 + 400);
      });
    }
  }

  function activateStep(index) {
    navCards.forEach(card => card.classList.remove("active"));
    panes.forEach(pane => pane.classList.remove("active"));

    navCards[index].classList.add("active");
    panes[index].classList.add("active");

    currentStep = index;
    triggerPaneAnimation(index);
  }

  function startAutoplay() {
    stopAutoplay();
    autoplayInterval = setInterval(() => {
      let nextStep = (currentStep + 1) % navCards.length;
      activateStep(nextStep);
    }, 6000);
  }

  function stopAutoplay() {
    if (autoplayInterval) clearInterval(autoplayInterval);
  }

  navCards.forEach((card, idx) => {
    card.addEventListener("click", () => {
      stopAutoplay();
      activateStep(idx);
    });

    card.addEventListener("mouseenter", () => {
      stopAutoplay();
      activateStep(idx);
    });

    card.addEventListener("mouseleave", () => {
      startAutoplay();
    });
  });

  activateStep(0);
  startAutoplay();
}

// Centralized Site Stats Source
window.siteStats = {
  processed: { value: 12000, suffix: '+', raw: '12,000+' },
  success: { value: 99.2, suffix: '%', raw: '99.2%' },
  support: { value: '24/7', raw: '24/7' },
  satisfaction: { value: 4.9, suffix: '', raw: '4.9' }
};

function applyCentralizedStats() {
  const stats = window.siteStats;
  if (!stats) return;

  // 1. Update index.html counters
  const processedNum = document.querySelector('.tm-card:nth-child(1) .metric-number');
  if (processedNum) {
    processedNum.setAttribute('data-target', stats.processed.value);
    processedNum.setAttribute('data-suffix', stats.processed.suffix);
    processedNum.textContent = stats.processed.raw;
  }
  const successNum = document.querySelector('.tm-card:nth-child(2) .metric-number');
  if (successNum) {
    successNum.setAttribute('data-target', stats.success.value);
    successNum.setAttribute('data-suffix', stats.success.suffix);
    successNum.textContent = stats.success.raw;
  }
  const supportNum = document.querySelector('.tm-card:nth-child(3) .tm-static');
  if (supportNum) {
    supportNum.textContent = stats.support.raw;
  }
  const satisfactionNum = document.querySelector('.tm-card:nth-child(4) .metric-number');
  if (satisfactionNum) {
    satisfactionNum.setAttribute('data-target', stats.satisfaction.value);
    satisfactionNum.setAttribute('data-suffix', stats.satisfaction.suffix);
    satisfactionNum.textContent = stats.satisfaction.raw;
  }

  // 2. Update service-pan-card.html stats strip
  const stripItems = document.querySelectorAll('.premium-trust-strip-glass .trust-strip-item-glass');
  if (stripItems.length >= 4) {
    const label1 = stripItems[0].querySelector('.metric-label-glass')?.textContent?.toLowerCase();
    if (label1 && label1.includes('processed')) {
      const val1 = stripItems[0].querySelector('.metric-val-glass');
      if (val1) val1.textContent = stats.processed.raw;

      const val2 = stripItems[1].querySelector('.metric-val-glass');
      if (val2) val2.textContent = stats.success.raw;

      const val3 = stripItems[2].querySelector('.metric-val-glass');
      if (val3) val3.textContent = stats.support.raw;

      const val4 = stripItems[3].querySelector('.metric-val-glass');
      if (val4) val4.textContent = stats.satisfaction.raw;
    }
  }

  // 3. Update any elements with data-stat attributes
  document.querySelectorAll('[data-stat]').forEach(el => {
    const key = el.getAttribute('data-stat');
    if (stats[key]) {
      if (el.classList.contains('metric-number')) {
        el.setAttribute('data-target', stats[key].value);
        el.setAttribute('data-suffix', stats[key].suffix || '');
      }
      el.textContent = stats[key].raw;
    }
  });
}

function setupTrustCounters() {
  applyCentralizedStats();

  const metricBoxes = document.querySelectorAll(".metric-box, .tm-card");
  if (metricBoxes.length === 0) return;

  const observerOptions = {
    root: null,
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const box = entry.target;
        const numberEl = box.querySelector(".metric-number");
        if (numberEl && !box.classList.contains("animated")) {
          box.classList.add("animated");
          animateCounter(numberEl);
        }
      }
    });
  }, observerOptions);

  metricBoxes.forEach(box => {
    observer.observe(box);
  });

  function animateCounter(el) {
    const rawTarget = el.getAttribute("data-target");
    if (!rawTarget) return;

    const prefix = el.getAttribute("data-prefix") || "";
    const suffix = el.getAttribute("data-suffix") || "";
    const isFraction = rawTarget.includes("/");
    
    let duration = 1800; // 1.8 seconds for smooth animation
    let startTime = null;

    if (isFraction) {
      const parts = rawTarget.split("/");
      const val1 = parseInt(parts[0]) || 0;
      const val2 = parseInt(parts[1]) || 0;

      function stepFraction(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const currentVal1 = Math.floor(easeProgress * val1);
        const currentVal2 = Math.floor(easeProgress * val2);
        el.textContent = `${prefix}${currentVal1}/${currentVal2}${suffix}`;
        if (progress < 1) {
          requestAnimationFrame(stepFraction);
        } else {
          el.textContent = `${prefix}${val1}/${val2}${suffix}`;
        }
      }
      requestAnimationFrame(stepFraction);
    } else {
      const isDecimal = rawTarget.includes(".");
      const targetVal = isDecimal ? parseFloat(rawTarget) : parseInt(rawTarget) || 0;

      function stepCount(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // cubic ease-out
        const currentVal = easeProgress * targetVal;
        
        const formattedVal = isDecimal ? currentVal.toFixed(1) : Math.floor(currentVal);
        el.textContent = `${prefix}${formattedVal}${suffix}`;
        
        if (progress < 1) {
          requestAnimationFrame(stepCount);
        } else {
          el.textContent = `${prefix}${rawTarget}${suffix}`;
        }
      }
      requestAnimationFrame(stepCount);
    }
  }
}

function setupLiveActivityFeed() {
  if (sessionStorage.getItem('opds_hide_activity_feed') === 'true') return;

  const activities = [
    { text: "PAN Card correction submitted", time: "2 minutes ago" },
    { text: "GST Registration completed", time: "5 minutes ago" },
    { text: "Income Certificate approved", time: "8 minutes ago" },
    { text: "Aadhaar Card details updated", time: "4 minutes ago" },
    { text: "Caste Certificate filed", time: "6 minutes ago" },
    { text: "Domicile Certificate approved", time: "10 minutes ago" },
    { text: "Passport Assistance request sent", time: "12 minutes ago" },
    { text: "Ayushman Card generated", time: "3 minutes ago" },
    { text: "Police Verification request completed", time: "15 minutes ago" },
    { text: "MSME Registration completed", time: "7 minutes ago" }
  ];

  let currentIndex = Math.floor(Math.random() * activities.length);

  const bar = document.createElement("div");
  bar.id = "live-activity-bar";
  bar.className = "live-activity-bar";
  bar.innerHTML = `
    <div class="live-activity-pulse"></div>
    <div class="live-activity-content">
      <strong>Live:</strong> <span class="live-activity-text"></span>
    </div>
    <button class="live-activity-close" aria-label="Close activity feed">
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
    </button>
  `;

  document.body.appendChild(bar);

  const textEl = bar.querySelector(".live-activity-text");
  const closeBtn = bar.querySelector(".live-activity-close");

  closeBtn.addEventListener("click", () => {
    bar.classList.remove("visible");
    sessionStorage.setItem('opds_hide_activity_feed', 'true');
    setTimeout(() => bar.remove(), 500);
  });

  function showNext() {
    if (sessionStorage.getItem('opds_hide_activity_feed') === 'true') return;
    
    bar.classList.remove("visible");

    setTimeout(() => {
      currentIndex = (currentIndex + 1) % activities.length;
      const act = activities[currentIndex];
      if (textEl) {
        textEl.innerHTML = `${act.text} <span style="opacity: 0.7; font-size: 0.78rem; font-style: italic;">(${act.time})</span>`;
      }
      bar.classList.add("visible");
    }, 500);
  }

  setTimeout(() => {
    const act = activities[currentIndex];
    if (textEl) {
      textEl.innerHTML = `${act.text} <span style="opacity: 0.7; font-size: 0.78rem; font-style: italic;">(${act.time})</span>`;
    }
    bar.classList.add("visible");
    
    setInterval(showNext, 8000);
  }, 3000);
}

function setupReviewAvatarSafeguards() {
  document.querySelectorAll(".review-avatar img").forEach((img) => {
    if (img.naturalWidth === 0) {
      handleBrokenImage(img);
    } else {
      img.addEventListener("error", () => {
        handleBrokenImage(img);
      });
    }
  });

  function handleBrokenImage(img) {
    const parent = img.parentElement;
    if (!parent) return;
    const card = img.closest(".review-card");
    const nameEl = card?.querySelector(".review-name");
    const name = nameEl ? nameEl.textContent : "Customer";
    const initials = name
      .split(" ")
      .map(part => part[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();
    parent.innerHTML = `<span class="review-initials-fallback">${initials}</span>`;
  }
}

function injectConversionFaqs() {
  const faqContainer = document.querySelector('.faq.premium-faq') || document.querySelector('.faq');
  if (!faqContainer) return;

  let serviceName = "this service";
  const filename = window.location.pathname.split('/').pop();
  if (filename && filename.startsWith('service-')) {
    const rawName = filename.replace('service-', '').replace('.html', '').replace(/-/g, ' ');
    serviceName = rawName.replace(/\b\w/g, c => c.toUpperCase());
  } else if (filename === 'edupoint.html') {
    serviceName = "Student Portal Services";
  } else {
    const titleText = document.title || "";
    if (titleText.includes("|")) {
      serviceName = titleText.split("|")[0].trim();
    }
  }

  const conversionFaqs = [
    {
      q: `What is the processing time for ${serviceName}?`,
      a: `The processing time varies depending on official department verification. Typically, our local operators review, align, and submit your request within 24 hours, and tracking updates are sent via WhatsApp.`
    },
    {
      q: `What documents are required for ${serviceName}?`,
      a: `Required documents depend on the specific application type. Typically, a valid ID proof (like Aadhaar card), address proof, and relevant supporting certificates are required. You can see the full checklist in the 'Required Documents' tab above.`
    },
    {
      q: `What is the refund policy if my application is not processed?`,
      a: `We provide a 100% refund if your application cannot be processed during our operator check phase. Please note that processing fees are non-refundable once the application has been officially submitted to the government portal.`
    },
    {
      q: `How will I receive the completed ${serviceName}?`,
      a: `The digital certificate or copy will be sent directly to your verified WhatsApp number and email. For physical cards or documents, they will be dispatched via speed post or made available for local pickup.`
    },
    {
      q: `What support availability is offered?`,
      a: `We provide 24×7 support for tracking and queries. You can chat with our team on WhatsApp or call our local support number for any assistance regarding document uploads or status.`
    }
  ];

  if (faqContainer.querySelector('[data-conversion-faq]')) return;

  const isPfaq = faqContainer.classList.contains('pfaq-grid');
  const chevronSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down"><path d="m6 9 6 6 6-6"/></svg>`;

  conversionFaqs.forEach(faq => {
    const item = document.createElement('div');
    item.className = 'faq-item';
    item.setAttribute('data-conversion-faq', 'true');

    const button = document.createElement('button');
    button.className = 'faq-question';
    button.setAttribute('data-faq-question', '');

    if (isPfaq) {
      const num = String(faqContainer.querySelectorAll('.faq-item').length + 1).padStart(2, '0');
      button.innerHTML = `<span class="pfaq-num">${num}</span><span class="pfaq-q-text">${faq.q}</span>${chevronSvg}`;
    } else {
      button.innerHTML = `${faq.q}${chevronSvg}`;
    }

    const answerDiv = document.createElement('div');
    answerDiv.className = 'faq-answer';
    answerDiv.innerHTML = `<p>${faq.a}</p>`;

    item.appendChild(button);
    item.appendChild(answerDiv);
    faqContainer.appendChild(item);
  });

  setupFaqs();

  // JSON-LD schema generation
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": []
  };

  const allFaqItems = faqContainer.querySelectorAll('.faq-item');
  allFaqItems.forEach(item => {
    const qEl = item.querySelector('.faq-question');
    const aEl = item.querySelector('.faq-answer p');
    if (qEl && aEl) {
      schema.mainEntity.push({
        "@type": "Question",
        "name": qEl.textContent.trim(),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": aEl.textContent.trim()
        }
      });
    }
  });

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.text = JSON.stringify(schema);
  document.head.appendChild(script);
}

function setupWhatsAppPrefills() {
  let serviceName = "One Point Services";
  const filename = window.location.pathname.split('/').pop();
  if (filename && filename.startsWith('service-')) {
    const rawName = filename.replace('service-', '').replace('.html', '').replace(/-/g, ' ');
    serviceName = rawName.replace(/\b\w/g, c => c.toUpperCase());
  } else if (filename === 'edupoint.html') {
    serviceName = "Student Portal Services";
  } else if (filename === 'products.html') {
    serviceName = "OneMart Store Products";
  } else if (filename === 'travel-services.html') {
    serviceName = "Travel Booking Services";
  } else {
    const titleText = document.title || "";
    if (titleText.includes("|")) {
      serviceName = titleText.split("|")[0].trim();
    }
  }

  const prefillText = `Hello,\nI need help regarding ${serviceName}.`;
  const encodedText = encodeURIComponent(prefillText);

  const waLinks = document.querySelectorAll('a[href*="wa.me"]');
  waLinks.forEach(link => {
    let href = link.getAttribute('href');
    if (!href) return;

    try {
      // Clean up potential invalid url strings before passing to URL constructor
      let cleanHref = href.trim();
      if (!cleanHref.startsWith('http://') && !cleanHref.startsWith('https://')) {
        cleanHref = 'https://' + cleanHref.replace(/^\/+/, '');
      }
      const urlObj = new URL(cleanHref);
      urlObj.searchParams.set('text', prefillText);
      link.setAttribute('href', urlObj.toString());
    } catch (e) {
      if (href.includes('?')) {
        href = href.replace(/([?&])text=[^&]*/g, '');
        href += `&text=${encodedText}`;
      } else {
        href += `?text=${encodedText}`;
      }
      href = href.replace(/\?&/, '?');
      link.setAttribute('href', href);
    }

    link.addEventListener('click', () => {
      if (window.trackAnalyticsEvent) {
        window.trackAnalyticsEvent('whatsapp_click', {
          service: serviceName,
          href: link.getAttribute('href'),
          location: window.location.pathname
        });
      }
    });
  });
}

function saveFormState() {
  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  const state = {
    serviceType: form.querySelector("#pan-service-type")?.value || "",
    currentStep: window.currentWizardStep || 1,
    inputs: {},
    filesMetadata: (window.attachedFiles || []).map(f => ({ name: f.name, size: f.size, type: f.type }))
  };

  form.querySelectorAll("input:not([type='file']):not([type='submit']), select, textarea").forEach(input => {
    if (input.name) {
      if (input.type === 'checkbox' || input.type === 'radio') {
        state.inputs[input.name] = input.checked;
      } else {
        state.inputs[input.name] = input.value;
      }
    }
  });

  localStorage.setItem('opds_abandoned_form_state', JSON.stringify(state));
}

function restoreFormState() {
  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  const rawState = localStorage.getItem('opds_abandoned_form_state');
  if (!rawState) return;

  try {
    const state = JSON.parse(rawState);
    if (!state) return;

    const serviceSelect = form.querySelector("#pan-service-type");
    if (serviceSelect && state.serviceType) {
      serviceSelect.value = state.serviceType;
      if (typeof window.applySelectedService === 'function') {
        window.applySelectedService();
      } else {
        serviceSelect.dispatchEvent(new Event('change'));
      }
    }

    Object.keys(state.inputs || {}).forEach(name => {
      const input = form.querySelector(`[name="${name}"]`);
      if (input) {
        if (input.type === 'checkbox' || input.type === 'radio') {
          input.checked = state.inputs[name];
        } else {
          input.value = state.inputs[name];
        }
        input.dispatchEvent(new Event('input'));
      }
    });

    if (state.filesMetadata && state.filesMetadata.length > 0) {
      window.attachedFiles = state.filesMetadata.map(f => ({
        name: f.name,
        size: f.size,
        type: f.type,
        isRestored: true
      }));
      window.renderAttachmentList();
    }

    if (state.currentStep && typeof window.goToStep === 'function') {
      setTimeout(() => {
        const originalScroll = window.scrollTo;
        const origScrollIntoView = Element.prototype.scrollIntoView;
        window.scrollTo = () => {};
        Element.prototype.scrollIntoView = () => {};
        
        window.goToStep(state.currentStep);
        
        window.scrollTo = originalScroll;
        Element.prototype.scrollIntoView = origScrollIntoView;

        showRecoveryToast();
      }, 350);
    }
  } catch (e) {
    console.error("Error restoring form state:", e);
  }
}

function showRecoveryToast() {
  const toast = document.createElement("div");
  toast.className = "recovery-toast";
  toast.style.cssText = "position: fixed; bottom: 24px; right: 24px; z-index: 1001; background: rgba(15, 23, 42, 0.9); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); color: #fff; font-size: 0.82rem; transition: opacity 0.4s; opacity: 0; display: flex; align-items: center; gap: 8px;";
  toast.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> <span>Restored your unfinished application form.</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.style.opacity = "1", 100);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}

function setupFormAbandonmentRecovery() {
  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (!form) return;

  form.addEventListener('input', saveFormState);
  form.addEventListener('change', saveFormState);

  const originalGoToStep = window.goToStep;
  if (typeof originalGoToStep === 'function') {
    window.goToStep = function(stepNum) {
      window.currentWizardStep = stepNum;
      originalGoToStep(stepNum);
      saveFormState();
    };
  }

  const originalHandleDeviceUpload = window.handleDeviceUpload;
  window.handleDeviceUpload = async function(input) {
    if (originalHandleDeviceUpload) {
      await originalHandleDeviceUpload(input);
    }
    saveFormState();
  };

  const originalRemoveAttachedFile = window.removeAttachedFile;
  window.removeAttachedFile = function(index) {
    if (originalRemoveAttachedFile) {
      originalRemoveAttachedFile(index);
    }
    saveFormState();
  };

  restoreFormState();
}

window.trackAnalyticsEvent = function(eventName, eventParams = {}) {
  const payload = {
    event: eventName,
    params: {
      ...eventParams,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    }
  };

  console.log(`[Analytics] Event Logged: ${eventName}`, payload);

  let logs = [];
  try {
    logs = JSON.parse(localStorage.getItem('opds_analytics_logs') || '[]');
  } catch (e) {}
  logs.push(payload);
  if (logs.length > 100) logs.shift();
  localStorage.setItem('opds_analytics_logs', JSON.stringify(logs));
};

document.addEventListener("DOMContentLoaded", () => {
  const filename = window.location.pathname.split('/').pop() || 'index.html';
  const isServicePage = filename.startsWith('service-') || 
                        filename === 'edupoint.html' || 
                        filename === 'products.html' || 
                        filename === 'travel-services.html';
  
  if (isServicePage) {
    let serviceName = filename.replace('service-', '').replace('.html', '').replace(/-/g, ' ');
    serviceName = serviceName.replace(/\b\w/g, c => c.toUpperCase());
    if (filename === 'edupoint.html') serviceName = 'STUDENT CORNER';
    if (filename === 'products.html') serviceName = 'ONEMART STORE';
    if (filename === 'travel-services.html') serviceName = 'TRAVEL SERVICES';

    window.trackAnalyticsEvent('service_view', {
      service: serviceName,
      path: window.location.pathname
    });
  }

  if (filename === 'index.html' || filename === '') {
    document.querySelectorAll('.btn, .cta-link, .btn-premium-gold, .btn-premium-blue, [onclick*="scrollIntoView"]').forEach(cta => {
      cta.addEventListener('click', () => {
        window.trackAnalyticsEvent('homepage_cta_click', {
          text: cta.textContent.trim(),
          id: cta.id || '',
          className: cta.className || ''
        });
      });
    });
  }

  const form = document.querySelector("#pan-apply-form[data-apply-form]");
  if (form) {
    let started = false;
    form.querySelectorAll("input, select, textarea").forEach(input => {
      input.addEventListener('focus', () => {
        if (!started) {
          started = true;
          window.trackAnalyticsEvent('apply_started', {
            service: form.dataset.serviceName || form.querySelector("#pan-service-type")?.value || 'Unknown'
          });
        }
      });
    });
  }
});
