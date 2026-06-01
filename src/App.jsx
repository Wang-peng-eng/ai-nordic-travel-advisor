import React, { useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCopy,
  Crown,
  FileDown,
  FileText,
  Hotel,
  Plane,
  Sparkles,
  Star,
} from "lucide-react";
import { destinationKnowledgeBase, hotelDatabase, pricingRules, supplierDatabase, tierProfiles, tierSpecialActivities, countryPremiumExperiences, countryBusinessActivities, tierBadgeColors } from "./config/travelData";

const agencyProfile = {
  name: "Nordic Horizon International Travel Services",
  chineseName: "北境环旅国际旅游服务中心",
  address: "中国上海市静安区南京西路国际旅行服务中心 18F",
  phone: "+86 21 6188 4572",
  email: "visa.docs@nordichorizon.cn",
  contact: "签证文书协调部",
};

const initialForm = {
  customerName: "陈思远",
  travelers: "4",
  departureCity: "上海",
  destinations: "冰岛雷克雅未克、南岸、瓦特纳冰川",
  departureDate: "2026-10-08",
  days: "9",
  budget: "48000",
  hotelLevel: "由预算自动匹配",
  preferences: "自然风光、摄影、极光",
  specialNeeds: "其中一位客人不吃牛羊肉，需要中文司导和可退改酒店方案。",
};

const fieldGroups = [
  [
    { name: "customerName", label: "客户姓名", type: "text" },
    { name: "travelers", label: "出行人数", type: "number" },
  ],
  [
    { name: "departureCity", label: "出发城市", type: "text" },
    { name: "departureDate", label: "出发日期", type: "date" },
  ],
  [{ name: "destinations", label: "目的地", type: "text", wide: true, placeholder: "例如：冰岛雷克雅未克、南岸、瓦特纳冰川" }],
  [
    { name: "days", label: "行程天数", type: "number" },
    { name: "budget", label: "人均预算", type: "number" },
  ],
  [
    {
      name: "hotelLevel",
      label: "酒店偏好",
      type: "select",
      options: ["由预算自动匹配", "经济型", "舒适型", "高端型"],
    },
  ],
  [{ name: "preferences", label: "出行偏好", type: "textarea", placeholder: "例如：亲子、摄影、极光、蜜月、商务考察" }],
  [{ name: "specialNeeds", label: "特殊需求", type: "textarea", placeholder: "例如：需中文司导、可退改酒店、减少高强度徒步、偏好景观酒店" }],
];

const customerTypeRules = [
  { key: "business", label: "商务考察", keywords: ["商务", "考察", "会奖", "供应商", "酒店考察", "拜访", "会议"] },
  { key: "family", label: "亲子出游", keywords: ["亲子", "儿童", "孩子", "家庭", "老人", "轻松"] },
  { key: "honeymoon", label: "蜜月旅行", keywords: ["蜜月", "情侣", "浪漫", "纪念日", "私享"] },
  { key: "photo", label: "摄影旅行", keywords: ["摄影", "拍照", "旅拍", "航拍", "日出", "日落", "极光"] },
  { key: "nature", label: "自然风光旅行", keywords: ["自然", "风光", "峡湾", "冰川", "瀑布", "森林", "徒步"] },
];

const typeToTags = {
  business: ["business", "photo", "family", "nature"],
  family: ["family", "nature", "photo"],
  honeymoon: ["honeymoon", "photo", "nature"],
  photo: ["photo", "nature", "honeymoon"],
  nature: ["nature", "photo", "family"],
};

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function formatDate(dateString) {
  if (!dateString) return "待定";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function addDays(dateString, days) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime()) || !Number(days)) return "待定";
  date.setDate(date.getDate() + Number(days) - 1);
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function compactDate(date = new Date()) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function currency(value) {
  const number = Number(value || 0);
  return number ? `¥${number.toLocaleString("zh-CN")}` : "待核算";
}

function makeDocumentNumber(form) {
  const seed = `${form.customerName}${form.departureDate}${form.travelers}${form.destinations}${form.days}`;
  const code = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 10000;
  return `NH-AI-${compactDate()}-${String(code).padStart(4, "0")}`;
}

function detectCountries(destinationInput) {
  const normalized = normalizeText(destinationInput);
  const countries = Object.entries(destinationKnowledgeBase)
    .filter(([, profile]) => profile.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())))
    .map(([key, profile]) => ({ key, ...profile }));

  return countries.length ? countries : [{ key: "iceland", ...destinationKnowledgeBase.iceland }];
}

function detectCustomerType(form) {
  const text = normalizeText(`${form.preferences} ${form.specialNeeds}`);
  return (
    customerTypeRules.find((rule) => rule.keywords.some((keyword) => text.includes(keyword.toLowerCase()))) ||
    customerTypeRules.find((rule) => rule.key === "nature")
  );
}

function resolveBudgetTier(budget, hotelLevel = "由预算自动匹配") {
  if (["经济型", "舒适型", "高端型"].includes(hotelLevel)) return hotelLevel;
  const value = Number(budget || 0);
  if (value >= 60000) return "高端型";
  if (value >= 30000) return "舒适型";
  return "经济型";
}

function getDayDate(startDate, dayIndex) {
  const date = new Date(`${startDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + dayIndex - 1);
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function allocateCountries(countries, totalDays) {
  return Array.from({ length: totalDays }, (_, index) => {
    const countryIndex = Math.min(countries.length - 1, Math.floor((index * countries.length) / totalDays));
    return countries[countryIndex];
  });
}

function rankAttractions(profile, customerType) {
  const preferredTags = typeToTags[customerType.key] || typeToTags.nature;
  return [...profile.attractions].sort((a, b) => {
    const aScore = preferredTags.reduce((score, tag, index) => score + (a.tags.includes(tag) ? 10 - index : 0), 0);
    const bScore = preferredTags.reduce((score, tag, index) => score + (b.tags.includes(tag) ? 10 - index : 0), 0);
    const routeA = profile.routeOrder.indexOf(a.region);
    const routeB = profile.routeOrder.indexOf(b.region);
    return bScore - aScore || (routeA === -1 ? 99 : routeA) - (routeB === -1 ? 99 : routeB);
  });
}

function makeRoomPlan(travelers, customerType, hotel) {
  const rooms = Math.max(1, Math.ceil(Number(travelers || 1) / 2));
  const roomType =
    customerType.key === "honeymoon"
      ? hotel.roomTypes.find((room) => room.includes("大床")) || hotel.roomTypes[0]
      : customerType.key === "family"
        ? hotel.roomTypes.find((room) => room.includes("家庭")) || hotel.roomTypes[0]
        : hotel.roomTypes[0];

  return { roomType, rooms };
}

function matchHotels(countries, hotelTier, travelers, customerType) {
  return countries.flatMap((country) => {
    const hotels = hotelDatabase[country.key]?.[hotelTier] || hotelDatabase.iceland[hotelTier] || [];
    return hotels.map((hotel) => ({
      countryKey: country.key,
      country: country.country,
      city: hotel.locationRegion || country.entryCity,
      tier: hotelTier,
      rating: hotel.rating,
      hotelName: hotel.name,
      nightlyRate: hotel.nightlyRate,
      priorityRegions: hotel.priorityRegions || [hotel.locationRegion || country.entryCity],
      ...makeRoomPlan(travelers, customerType, hotel),
    }));
  });
}

function scoreAttractionForHotel(attraction, profile, customerType, hotel) {
  const preferredTags = typeToTags[customerType.key] || typeToTags.nature;
  const tagScore = preferredTags.reduce((score, tag, index) => score + (attraction.tags.includes(tag) ? 10 - index : 0), 0);
  const routeIndex = profile.routeOrder.indexOf(attraction.region);
  const routeScore = routeIndex === -1 ? 0 : Math.max(0, 20 - routeIndex);
  const hotelScore = hotel?.priorityRegions?.includes(attraction.region) ? 40 : 0;
  return hotelScore + tagScore + routeScore;
}

function selectHotelForDay(country, countryDayIndex, countryTotalDays, hotelMatches) {
  const hotels = hotelMatches.filter((hotel) => hotel.countryKey === country.key);
  if (!hotels.length) return null;
  const segment = Math.min(hotels.length - 1, Math.floor((countryDayIndex * hotels.length) / Math.max(countryTotalDays, 1)));
  return hotels[segment];
}

function planAttractions(countries, customerType, days, hotelMatches) {
  const totalDays = Math.max(1, Math.min(Number(days || 1), 30));
  const countryByDay = allocateCountries(countries, totalDays);
  const usedByCountry = new Map(countries.map((country) => [country.key, new Set()]));
  const countsByCountry = countryByDay.reduce((map, country) => map.set(country.key, (map.get(country.key) || 0) + 1), new Map());
  const seenByCountry = new Map(countries.map((country) => [country.key, 0]));

  return countryByDay.map((country, index) => {
    const day = index + 1;
    const countryDayIndex = seenByCountry.get(country.key);
    seenByCountry.set(country.key, countryDayIndex + 1);
    const used = usedByCountry.get(country.key);
    const hotel = selectHotelForDay(country, countryDayIndex, countsByCountry.get(country.key), hotelMatches);
    let route = [...country.attractions]
      .filter((item) => !used.has(item.name) && hotel?.priorityRegions?.includes(item.region))
      .sort(
        (a, b) => scoreAttractionForHotel(b, country, customerType, hotel) - scoreAttractionForHotel(a, country, customerType, hotel),
      );
    // Fallback: if no unused attraction in priorityRegions, use any unused country attraction
    if (!route.length) {
      route = [...country.attractions]
        .filter((item) => !used.has(item.name))
        .sort(
          (a, b) => scoreAttractionForHotel(b, country, customerType, hotel) - scoreAttractionForHotel(a, country, customerType, hotel),
        );
    }
    // Last resort: recycle already-used attractions from priorityRegions
    if (!route.length) {
      route = [...country.attractions]
        .filter((item) => hotel?.priorityRegions?.includes(item.region))
        .sort(
          (a, b) => scoreAttractionForHotel(b, country, customerType, hotel) - scoreAttractionForHotel(a, country, customerType, hotel),
        );
    }
    const attraction = route[0] || null;
    if (attraction) used.add(attraction.name);

    return {
      day,
      country,
      attraction,
      hotel,
      date: getDayDate(initialForm.departureDate, day),
    };
  });
}

function trimSentencePunctuation(text) {
  return String(text || "").replace(/[。.!！]+$/u, "");
}

function buildDailyRows(form, dailyPlans, customerType, hotelTier, tierProfile = null) {
  const totalDays = dailyPlans.length;
  const profile = tierProfile || tierProfiles[hotelTier] || tierProfiles["舒适型"];

  // Build per-country special activities from premium library with random selection
  const specialsByCountry = {};
  dailyPlans.forEach((plan) => {
    const ck = plan.country.key;
    if (specialsByCountry[ck] !== undefined) return;
    const premiumPool = countryPremiumExperiences[ck];
    const pool = premiumPool?.[hotelTier] || tierSpecialActivities[ck]?.[hotelTier] || [];
    if (pool.length === 0) {
      specialsByCountry[ck] = [];
      return;
    }
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    if (hotelTier === "经济型") {
      specialsByCountry[ck] = [];
    } else if (hotelTier === "舒适型") {
      specialsByCountry[ck] = shuffled.slice(0, 1);
    } else {
      const count = Math.min(2 + Math.floor(Math.random() * 2), shuffled.length);
      specialsByCountry[ck] = shuffled.slice(0, count);
    }
  });

  // Flatten into ordered list aligned with dailyPlans — each experience appears once
  const orderedSpecials = [];
  const usedSpecials = new Set();
  dailyPlans.forEach((plan) => {
    const items = specialsByCountry[plan.country.key] || [];
    items.forEach((item) => {
      if (!usedSpecials.has(item)) {
        usedSpecials.add(item);
        orderedSpecials.push(item);
      }
    });
  });

  let specialIndex = 0;

  return dailyPlans.map((plan, index) => {
    const day = index + 1;
    const date = getDayDate(form.departureDate, day);
    const attraction = plan.attraction;
    const country = plan.country;
    const hotel = plan.hotel;
    const countrySpecials = orderedSpecials;
    const isBusiness = customerType.key === "business";
    const bizActivities = isBusiness ? countryBusinessActivities[country.key] || countryBusinessActivities.iceland : null;
    const typeFocus = isBusiness
      ? (day === 1
          ? bizActivities.dayOne
          : day === totalDays
            ? bizActivities.closing
            : (bizActivities.dailyItems || [bizActivities.daily])[(day - 2) % (bizActivities.dailyItems || [bizActivities.daily]).length])
      : {
          family: "控制车程和步行强度，保留亲子休息时间",
          honeymoon: "预留慢节奏体验、景观用餐和私密停留",
          photo: "优先匹配清晨、傍晚或夜间摄影窗口",
          nature: "以自然景观、轻户外和目的地代表资源为主",
        }[customerType.key] || "";

    let specialText = "";
    if (countrySpecials.length && day > 1 && day < totalDays) {
      const midDays = totalDays - 2;
      const slotsPerSpecial = midDays > 0 ? Math.max(1, Math.floor(midDays / Math.max(countrySpecials.length, 1))) : 1;
      if ((day - 2) % slotsPerSpecial === 0 && specialIndex < countrySpecials.length) {
        specialText = `【特色体验：${countrySpecials[specialIndex]}】`;
        specialIndex++;
      }
    }

    const nearbyRegions = hotel?.priorityRegions?.join("、") || country.entryCity;
    const nearbyPreview = country.attractions
      ?.filter((a) => hotel?.priorityRegions?.includes(a.region))
      .slice(0, 3)
      .map((a) => a.name)
      .join("、") || nearbyRegions;

    if (day === 1) {
      return [
        `Day${day}`,
        `${date}；${form.departureCity || "出发地"} - ${country.entryCity}。抵达${country.country}后${profile.dayDesc.arrival}，入住${hotel?.hotelName || hotelTier + "酒店"}（${hotel?.city || country.entryCity}）。${profile.guideType}。根据酒店覆盖区域（${nearbyRegions}），优先安排${nearbyPreview}等周边景点初览与入住确认。${typeFocus}。`,
      ];
    }

    if (day === totalDays) {
      return [
        `Day${day}`,
        `${date}；${hotel?.city || country.entryCity} - ${form.departureCity || "出发地"}。上午从${hotel?.hotelName || "酒店"}退房，核对酒店确认函、票据、费用说明和签证辅助材料；视航班时间安排${nearbyPreview}周边补充游览后${profile.dayDesc.departure}返程。${typeFocus ? typeFocus + "。" : ""}`,
      ];
    }

    return [
      `Day${day}`,
      `${date}；入住地：${hotel?.city || country.entryCity}（${hotel?.hotelName || hotelTier + "酒店"}）。${profile.dayDesc.daily}。围绕酒店覆盖区域安排${country.country}${attraction?.region || hotel?.city || country.entryCity}周边行程，核心安排：${attraction?.name || nearbyPreview.split("、")[0] || country.routeOrder[0]}。业务说明：${trimSentencePunctuation(attraction?.note || `${country.country}${hotel?.city || country.entryCity}区域核心旅游资源`) || `${country.country}${hotel?.city || country.entryCity}周边代表景点与人文体验`}。${specialText}${typeFocus}。`,
    ];
  });
}

function calculateQuote({ travelers, days, hotelTier, customerType, dailyPlans }) {
  const nights = Math.max(0, Number(days || 1) - 1);
  const roomNightsByHotel = dailyPlans.slice(0, nights).reduce((items, plan) => {
    const key = plan.hotel?.hotelName || "待定酒店";
    const current = items.get(key) || { hotel: plan.hotel, nights: 0 };
    current.nights += 1;
    items.set(key, current);
    return items;
  }, new Map());
  const accommodationCost = [...roomNightsByHotel.values()].reduce((sum, item) => {
    const nightlyRate = Number(item.hotel?.nightlyRate || 0);
    const rooms = Number(item.hotel?.rooms || Math.ceil(travelers / 2));
    return sum + nightlyRate * rooms * item.nights;
  }, 0);
  const typeMultiplier = pricingRules.customerTypeMultiplier[customerType.key] || 1;
  const tierMultiplier = pricingRules.hotelTierMultiplier[hotelTier] || 1;
  const transportCost = Math.round((pricingRules.transportPerDay[hotelTier] || 2600) * Number(days || 1) * typeMultiplier);
  const activityCost = Math.round((pricingRules.activityPerPersonDay[customerType.key] || 620) * travelers * Number(days || 1) * tierMultiplier);
  const subtotal = accommodationCost + transportCost + activityCost;
  const serviceFee = Math.round(subtotal * (pricingRules.serviceFeeRate[hotelTier] || 0.1));
  const visaAssistFee = travelers * pricingRules.visaAssistPerPerson;
  const total = accommodationCost + transportCost + activityCost + serviceFee + visaAssistFee;

  return { accommodationCost, transportCost, activityCost, serviceFee, visaAssistFee, total, roomNightsByHotel: [...roomNightsByHotel.values()] };
}

function buildHotelStays(form, dailyPlans) {
  const nightPlans = dailyPlans.slice(0, Math.max(0, dailyPlans.length - 1));
  const stays = [];

  nightPlans.forEach((plan, index) => {
    const hotelName = plan.hotel?.hotelName || "待定酒店";
    const lastStay = stays[stays.length - 1];

    if (lastStay?.hotelName === hotelName) {
      lastStay.endDay = index + 1;
      lastStay.nights += 1;
      lastStay.checkOut = getDayDate(form.departureDate, index + 2);
      return;
    }

    stays.push({
      country: plan.country.country,
      city: plan.hotel?.city || plan.country.entryCity,
      hotelName,
      rating: plan.hotel?.rating || "待定",
      tier: plan.hotel?.tier || "待定",
      roomType: plan.hotel?.roomType || "待定房型",
      rooms: plan.hotel?.rooms || Math.max(1, Math.ceil(Number(form.travelers || 1) / 2)),
      checkIn: getDayDate(form.departureDate, index + 1),
      checkOut: getDayDate(form.departureDate, index + 2),
      startDay: index + 1,
      endDay: index + 1,
      nights: 1,
    });
  });

  return stays;
}

function matchSuppliers(countries, customerType) {
  return countries.flatMap((country) => {
    const suppliers = supplierDatabase[country.key] || { hotel: [], local: [], activity: [] };
    const activityIndex = customerType.key === "photo" ? 1 : customerType.key === "honeymoon" || customerType.key === "business" ? 2 : 0;
    const localIndex = customerType.key === "business" ? 1 : customerType.key === "family" ? 2 : 0;
    return [
      ["酒店供应商", country.country, suppliers.hotel[0]],
      ["地接供应商", country.country, suppliers.local[localIndex] || suppliers.local[0]],
      ["活动供应商", country.country, suppliers.activity[activityIndex] || suppliers.activity[0]],
    ].map(([type, countryName, supplier]) => [
      `${countryName}${type}`,
      supplier ? `${supplier.name}；${supplier.service}；${supplier.contact}` : "待维护",
    ]);
  });
}

function makeInvitationLetter(form, customerType, destination, startDate, endDate, travelers, hotelMatches) {
  const commonTable = [
    ["Invited Party", form.customerName || "To be confirmed"],
    ["Travel Party", `${travelers} person(s)`],
    ["Travel Period", `${startDate} - ${endDate}`],
    ["Destination", destination],
    ["Contact", `${agencyProfile.phone} / ${agencyProfile.email}`],
  ];

  if (customerType.key === "business") {
    return {
      title: "商务邀请函",
      heading: "BUSINESS INVITATION LETTER",
      recipient: "To: Visa Officer / Consular Section",
      subject: `Subject: Business Visit Invitation for ${destination}`,
      paragraphs: [
        `${agencyProfile.name} formally invites ${form.customerName || "the applicant"} and accompanying travel party to visit ${destination} for tourism product inspection, hotel resource review and supplier communication.`,
        `The visit includes accommodation inspection at ${hotelMatches.map((item) => item.hotelName).join(", ")} and destination service evaluation according to the submitted itinerary.`,
      ],
      table: [["Visit Purpose", "Business inspection, supplier communication and customized travel product review."], ...commonTable],
      closing: "This invitation is provided for visa support and business travel documentation purposes.",
    };
  }

  if (customerType.key === "family") {
    return {
      title: "旅行邀请函",
      heading: "FAMILY TRAVEL INVITATION LETTER",
      recipient: "To: Visa Officer / Consular Section",
      subject: `Subject: Family Travel Support Letter for ${destination}`,
      paragraphs: [
        `${agencyProfile.name} confirms that ${form.customerName || "the applicant"} and family members plan to visit ${destination} for leisure travel.`,
        "The itinerary is designed with reduced walking intensity, suitable hotel room allocation and family-friendly destination resources.",
      ],
      table: [["Travel Purpose", "Family leisure travel and destination experience."], ...commonTable],
      closing: "This letter is issued for visa documentation support and does not constitute financial sponsorship.",
    };
  }

  if (customerType.key === "honeymoon") {
    return {
      title: "蜜月行程说明函",
      heading: "HONEYMOON ITINERARY STATEMENT",
      recipient: "To: Visa Officer / Consular Section",
      subject: `Subject: Honeymoon Travel Statement for ${destination}`,
      paragraphs: [
        `${agencyProfile.name} confirms that ${form.customerName || "the applicant"} plans a honeymoon-oriented itinerary to ${destination}.`,
        "The route emphasizes boutique accommodation, scenic experiences, slower pacing and private travel moments suitable for a honeymoon trip.",
      ],
      table: [["Travel Purpose", "Honeymoon travel and private scenic experience."], ...commonTable],
      closing: "This statement is issued for visa support and travel arrangement reference.",
    };
  }

  return {
    title: customerType.key === "photo" ? "摄影旅行说明函" : "旅行邀请函",
    heading: customerType.key === "photo" ? "PHOTOGRAPHY TRAVEL STATEMENT" : "TRAVEL INVITATION LETTER",
    recipient: "To: Visa Officer / Consular Section",
    subject: `Subject: Travel Support Letter for ${destination}`,
    paragraphs: [
      `${agencyProfile.name} confirms that ${form.customerName || "the applicant"} plans to visit ${destination} for ${customerType.label}.`,
      "The route is built from destination-specific resources and matched with the declared travel preferences and accommodation budget.",
    ],
    table: [["Travel Purpose", customerType.label], ...commonTable],
    closing: "This letter is provided for visa support and travel documentation purposes.",
  };
}

function makeHotelLetter(form, countries, hotelStays, travelers) {
  const table = hotelStays.flatMap((stay, index) => [
    [`第${index + 1}段酒店名称`, `${stay.hotelName}（${stay.country} / ${stay.city}）`],
    [`第${index + 1}段酒店等级`, `${stay.rating} / ${stay.tier}`],
    [`第${index + 1}段入住日期`, stay.checkIn],
    [`第${index + 1}段退房日期`, stay.checkOut],
    [`第${index + 1}段房型`, stay.roomType],
    [`第${index + 1}段房间数量`, `${stay.rooms}间 / ${stay.nights}晚`],
  ]);

  return {
    heading: "HOTEL RESERVATION CONFIRMATION LETTER",
    recipient: "To: Visa Officer / Consular Section",
    subject: `Subject: Accommodation Confirmation for ${form.customerName || "Applicant"} and Travel Party`,
    paragraphs: [
      `${agencyProfile.name} confirms that accommodation arrangements are being coordinated for ${form.customerName || "the applicant"} and accompanying travel party of ${travelers} person(s).`,
      `The accommodation plan is matched from the internal hotel database for ${countries.map((country) => country.country).join("、")} and selected according to hotel location, room quantity, travel purpose and itinerary sequence.`,
    ],
    table,
    closing:
      "This hotel confirmation is issued for visa documentation and supplier coordination. Final booking numbers shall be issued after room availability and payment terms are confirmed.",
  };
}

function makeMetadata(form) {
  return {
    documentNo: makeDocumentNumber(form),
    generatedDate: formatDate(new Date().toISOString().slice(0, 10)),
    contact: `${agencyProfile.contact} / ${agencyProfile.phone} / ${agencyProfile.email}`,
    remarks: "本文件由本地目的地知识库与酒店数据库生成，用于旅行社内部方案、签证辅助材料和供应商沟通；正式递签前需核验护照、机票、酒店预订号和保险信息。",
  };
}

function buildDocuments(form, forcedTier = null) {
  const travelers = Number(form.travelers || 1);
  const days = Number(form.days || 1);
  const budget = Number(form.budget || 0);
  const countries = detectCountries(form.destinations);
  const customerType = detectCustomerType(form);
  const hotelTier = forcedTier || resolveBudgetTier(budget, form.hotelLevel);
  const tierProfile = tierProfiles[hotelTier];
  const hotelMatches = matchHotels(countries, hotelTier, travelers, customerType);
  const startDate = formatDate(form.departureDate);
  const endDate = addDays(form.departureDate, days);
  const destination = countries.map((country) => country.country).join("、");
  const dailyPlans = planAttractions(countries, customerType, days, hotelMatches);
  const itineraryRows = buildDailyRows(form, dailyPlans, customerType, hotelTier, tierProfile);
  const quote = calculateQuote({ travelers, days, hotelTier, customerType, dailyPlans });
  const hotelStays = buildHotelStays(form, dailyPlans);
  const supplierRows = matchSuppliers(countries, customerType);
  const hotelLetter = makeHotelLetter(form, countries, hotelStays, travelers);
  const invitationLetter = makeInvitationLetter(form, customerType, destination, startDate, endDate, travelers, hotelMatches);

  return [
    {
      id: "overview",
      title: "客户需求",
      icon: Sparkles,
      rows: [
        ["客户姓名", form.customerName || "待补充"],
        ["出行人数", `${travelers}人`],
        ["出发城市", form.departureCity || "待补充"],
        ["目的地输入", form.destinations || "待补充"],
        ["识别目的地", destination],
        ["客户类型", customerType.label],
        ["出行日期", `${startDate} 至 ${endDate}`],
        ["人均预算", currency(form.budget)],
        ["酒店等级", hotelTier],
        ["方案档位", `${tierProfile.label} — ${tierProfile.tagline}`],
        ["交通方式", tierProfile.transportMode],
        ["导游服务", tierProfile.guideType],
        ["特殊需求", form.specialNeeds || "无"],
      ],
      clauses: ["生成流程：客户需求 -> 目的地分析 -> 酒店位置匹配 -> 供应商匹配 -> 景点规划 -> 费用计算 -> 签证材料清单 -> 酒店确认函 -> 邀请函 -> 最终文书输出。"],
    },
    {
      id: "analysis",
      title: "目的地分析",
      icon: Plane,
      rows: countries.map((country) => [
        country.country,
        `入境/核心城市：${country.entryCity}；知识库路线：${country.routeOrder.join(" -> ")}；本次仅从${country.country}知识库读取景点。`,
      ]),
      clauses: [`系统按国家隔离景点知识库：本次行程仅调用识别目的地（${destination}）对应的景点库，不跨国家混用景点资源。`],
    },
    {
      id: "hotelMatch",
      title: "酒店匹配",
      icon: Hotel,
      rows: hotelMatches.flatMap((hotel) => [
        [`${hotel.country}-${hotel.city}`, `${hotel.hotelName}（${hotel.rating} / ${hotel.tier} / ${currency(hotel.nightlyRate)}每间夜）`],
        [`${hotel.country}-${hotel.city}房型`, `${hotel.roomType}；${hotel.rooms}间；优先覆盖：${hotel.priorityRegions.join("、")}`],
      ]),
      clauses: [
        `预算分级：${currency(form.budget)} / 人 -> ${hotelTier}（${tierProfile.label}：${tierProfile.serviceLevel}）。酒店来自配置化酒店数据库，按酒店所在区域影响每日景点排序。`,
        `本次住宿晚数分配：${hotelStays.map((stay) => `${stay.hotelName} ${stay.nights}晚（${stay.checkIn}入住，${stay.checkOut}退房）`).join("；")}。`,
      ],
    },
    {
      id: "suppliers",
      title: "供应商匹配",
      icon: BriefcaseBusiness,
      rows: supplierRows,
      clauses: ["供应商来自配置化供应商数据库，按目的地和客户类型选择酒店、地接、活动资源；后续可替换为供应商后台或 API。"],
    },
    {
      id: "itinerary",
      title: "景点规划 / 行程安排",
      icon: CalendarDays,
      rows: itineraryRows,
      clauses: [
        `本次行程严格按 ${days} 天生成，输出范围 Day1-Day${days}。`,
        "景点不做循环复用；当行程天数超过某国家优先景点数时，系统会使用该国家知识库中的延展资源或服务参访节点。",
      ],
    },
    {
      id: "costs",
      title: "费用计算",
      icon: FileText,
      rows: [
        ["住宿费用", currency(quote.accommodationCost)],
        ["交通费用", currency(quote.transportCost)],
        ["活动费用", currency(quote.activityCost)],
        ["服务费", currency(quote.serviceFee)],
        ["签证辅助费", currency(quote.visaAssistFee)],
        ["方案总价（整团）", currency(quote.total)],
        ["人均参考价", currency(Math.round(quote.total / Math.max(travelers, 1)))],
      ],
      clauses: [
        `计算规则：人数 ${travelers} 人，天数 ${days} 天，酒店等级 ${hotelTier}（${tierProfile.label}），客户类型 ${customerType.label}。`,
        `费用包含：${tierProfile.mealsIncluded}；${tierProfile.ticketCoverage}；${tierProfile.transportMode}；${tierProfile.guideType}。`,
        `特色项目：${tierProfile.specialActivitiesNote}。`,
        "报价根据配置化单价和系数计算，最终金额以酒店供应商确认、车辆调度、活动库存和汇率为准。",
      ],
    },
    {
      id: "visa",
      title: "签证材料清单",
      icon: BriefcaseBusiness,
      rows: [
        ["身份文件", "护照原件、身份证复印件、户口本复印件、婚姻状况证明。"],
        ["职业证明", customerType.key === "business" ? "在职证明、派遣函、营业执照副本、商务访问目的说明。" : "在职证明、营业执照副本或收入来源说明。"],
        ["资产证明", "近6个月银行流水、余额证明、房产或车辆等辅助资产材料。"],
        ["旅行证明", "往返机票预订单、酒店确认函、境外保险单、英文行程单、费用说明及对应邀请/说明函。"],
        ["补充材料", form.specialNeeds || "如有老人、学生、未成年人或特殊餐食/医疗需求，应补充相应说明。"],
      ],
      clauses: ["材料递交前需核对姓名拼写、护照号码、旅行日期、酒店日期和保险覆盖日期。"],
    },
    { id: "hotel", title: "酒店确认函", icon: Hotel, letter: hotelLetter },
    { id: "invitation", title: invitationLetter.title, icon: BriefcaseBusiness, letter: invitationLetter },
  ];
}

function renderTextSection(section) {
  if (section.letter) {
    return [
      section.title,
      section.letter.heading,
      section.letter.recipient,
      section.letter.subject,
      ...section.letter.paragraphs,
      ...section.letter.table.map(([label, value]) => `${label}: ${value}`),
      section.letter.closing,
    ].join("\n");
  }

  return [
    section.title,
    ...(section.rows || []).map(([label, value]) => `${label}: ${value}`),
    ...(section.clauses || []).map((clause) => `- ${clause}`),
  ].join("\n");
}

function buildThreeTierPlans(form) {
  const tiers = ["经济型", "舒适型", "高端型"];
  return tiers.map((tier) => {
    const sections = buildDocuments(form, tier);
    const costsSection = sections.find((s) => s.id === "costs");
    const hotelSection = sections.find((s) => s.id === "hotelMatch");
    const profile = tierProfiles[tier];
    const travelers = Number(form.travelers || 1);

    const totalRow = costsSection?.rows?.find((r) => r[0] === "方案总价（整团）");
    const perPersonRow = costsSection?.rows?.find((r) => r[0] === "人均参考价");
    const totalPrice = totalRow?.[1] || "待核算";
    const perPersonPrice = perPersonRow?.[1] || "待核算";

    const firstHotelRow = hotelSection?.rows?.[0];
    const hotelSample = firstHotelRow?.[1] || "";

    const featureRows = [
      ["交通方式", profile.transportMode],
      ["导游服务", profile.guideType],
      ["餐饮标准", profile.mealsIncluded],
      ["门票覆盖", profile.ticketCoverage],
      ["特色项目", profile.specialActivitiesNote],
    ];

    return {
      tier,
      profile,
      sections,
      totalPrice,
      perPersonPrice,
      hotelSample,
      featureRows,
      metadata: makeMetadata(form),
    };
  });
}

function extractPlanSummary(sections, tier) {
  const profile = tierProfiles[tier];
  const costsSection = sections.find((s) => s.id === "costs");
  const hotelSection = sections.find((s) => s.id === "hotelMatch");
  const totalRow = costsSection?.rows?.find((r) => r[0] === "总价");
  const firstHotelRow = hotelSection?.rows?.[0];

  return {
    totalPrice: totalRow?.[1] || "待核算",
    hotelSample: firstHotelRow?.[1] || "",
    transportMode: profile.transportMode,
    guideType: profile.guideType,
    mealsIncluded: profile.mealsIncluded,
    ticketCoverage: profile.ticketCoverage,
    specialActivitiesNote: profile.specialActivitiesNote,
    serviceLevel: profile.serviceLevel,
  };
}

function App() {
  const [form, setForm] = useState(initialForm);
  const [threePlans, setThreePlans] = useState(() => buildThreeTierPlans(initialForm));
  const [selectedTier, setSelectedTier] = useState("舒适型");
  const [copied, setCopied] = useState(false);

  const selectedPlan = threePlans.find((p) => p.tier === selectedTier) || threePlans[1];
  const documentData = { metadata: selectedPlan.metadata, sections: selectedPlan.sections };

  const resultText = useMemo(
    () =>
      [
        "AI北欧定制游顾问 - AI旅游方案与签证文书自动化平台",
        `文档编号: ${documentData.metadata.documentNo}`,
        `方案档位: ${tierProfiles[selectedTier].label}`,
        `生成日期: ${documentData.metadata.generatedDate}`,
        `联系方式: ${documentData.metadata.contact}`,
        `备注说明: ${documentData.metadata.remarks}`,
        "",
        ...documentData.sections.map(renderTextSection),
      ].join("\n\n"),
    [documentData, selectedTier],
  );

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handleGenerate(event) {
    event.preventDefault();
    const plans = buildThreeTierPlans(form);
    setThreePlans(plans);
    setSelectedTier("舒适型");
    setCopied(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(resultText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function handleExportWord() {
    const html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
        <head>
          <meta charset="utf-8">
          <title>AI北欧定制游顾问文书</title>
          <style>
            body { font-family: "Microsoft YaHei", Arial, sans-serif; color: #17202a; line-height: 1.65; }
            h1 { font-size: 22px; }
            h2 { margin-top: 26px; border-bottom: 1px solid #b8c5c9; padding-bottom: 6px; font-size: 18px; }
            h3 { font-size: 15px; letter-spacing: 0.04em; }
            table { width: 100%; border-collapse: collapse; margin: 12px 0; }
            td { border: 1px solid #cfd8dc; padding: 8px; vertical-align: top; }
            .label { width: 28%; font-weight: 700; background: #f2f5f6; }
            .meta { margin-bottom: 16px; padding: 10px; border: 1px solid #cfd8dc; }
            .signature { margin-top: 24px; }
          </style>
        </head>
        <body>
          <h1>AI北欧定制游顾问文书 — ${tierProfiles[selectedTier].label}</h1>
          <div class="meta">
            <p><strong>文档编号：</strong>${documentData.metadata.documentNo}</p>
            <p><strong>方案档位：</strong>${tierProfiles[selectedTier].label} — ${tierProfiles[selectedTier].tagline}</p>
            <p><strong>生成日期：</strong>${documentData.metadata.generatedDate}</p>
            <p><strong>联系方式：</strong>${documentData.metadata.contact}</p>
            <p><strong>备注说明：</strong>${documentData.metadata.remarks}</p>
          </div>
          ${documentData.sections.map(sectionToHtml).join("")}
        </body>
      </html>
    `;
    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${documentData.metadata.documentNo}-${form.customerName || "客户"}-旅游文书.doc`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#eef3f4]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-fjord sm:text-sm">
              <Sparkles size={14} className="sm:w-4 sm:h-4" />
              AI旅游方案与签证文书自动化平台
            </div>
            <h1 className="text-xl font-semibold tracking-normal text-ink sm:text-2xl lg:text-3xl">
              AI北欧定制游顾问
            </h1>
            <p className="mt-1 text-xs text-slate-600 sm:mt-2 sm:text-sm">
              根据目的地、酒店位置、供应商资源、客户类型和预算自动生成旅游方案与签证文书
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] text-slate-600 sm:gap-2 sm:text-xs sm:min-w-80">
            <div className="border border-slate-200 bg-ledger px-2 py-2 sm:px-3 sm:py-3">
              <strong className="block text-base text-ink sm:text-lg">KB</strong>
              目的地库
            </div>
            <div className="border border-slate-200 bg-ledger px-2 py-2 sm:px-3 sm:py-3">
              <strong className="block text-base text-ink sm:text-lg">Hotel</strong>
              酒店匹配
            </div>
            <div className="border border-slate-200 bg-ledger px-2 py-2 sm:px-3 sm:py-3">
              <strong className="block text-base text-ink sm:text-lg">Plan</strong>
              方案规划
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[390px_minmax(0,1fr)] lg:px-8">
        <aside className="self-start border border-slate-200 bg-white shadow-panel">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <FileText size={18} />
              客户需求表单
            </h2>
            <p className="mt-1 text-xs text-slate-500">输入客户需求后，系统按真实旅行社内部流程生成方案、报价和签证文书。</p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4 p-5">
            {fieldGroups.map((group, index) => (
              <div key={index} className={group.length > 1 ? "grid md:grid-cols-2 gap-3" : "grid gap-3"}>
                {group.map((field) => (
                  <label key={field.name} className={field.wide ? "md:col-span-2 block" : "block"}>
                    <span className="mb-1.5 block text-xs font-semibold text-slate-700">{field.label}</span>
                    {field.type === "textarea" ? (
                      <textarea
                        value={form[field.name]}
                        onChange={(event) => updateField(field.name, event.target.value)}
                        placeholder={field.placeholder || ""}
                        rows={3}
                        className="w-full resize-none border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-fjord focus:ring-2 focus:ring-fjord/15 placeholder:text-slate-400"
                      />
                    ) : field.type === "select" ? (
                      <select
                        value={form[field.name]}
                        onChange={(event) => updateField(field.name, event.target.value)}
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-fjord focus:ring-2 focus:ring-fjord/15"
                      >
                        {field.options.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={field.type}
                        value={form[field.name]}
                        onChange={(event) => updateField(field.name, event.target.value)}
                        placeholder={field.placeholder || ""}
                        className="w-full border border-slate-300 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-fjord focus:ring-2 focus:ring-fjord/15 placeholder:text-slate-400"
                      />
                    )}
                  </label>
                ))}
              </div>
            ))}

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 bg-fjord px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#184d5d] focus:outline-none focus:ring-2 focus:ring-fjord/30"
            >
              <Sparkles size={18} />
              生成方案
            </button>
          </form>
        </aside>

        <section className="border border-slate-200 bg-white shadow-panel">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">三档方案对比</h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>文档编号：{documentData.metadata.documentNo}</span>
                <span>生成日期：{documentData.metadata.generatedDate}</span>
                <span>当前档位：{tierProfiles[selectedTier].label}</span>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-fjord hover:text-fjord"
              >
                <ClipboardCopy size={16} />
                {copied ? "已复制" : "复制结果"}
              </button>
              <button
                type="button"
                onClick={handleExportWord}
                className="inline-flex items-center gap-2 border border-fjord bg-fjord px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#184d5d]"
              >
                <FileDown size={16} />
                导出Word
              </button>
            </div>
          </div>

          <div className="space-y-4 p-5">
            {/* 档位卖点说明 */}
            <div className="border border-slate-200 bg-[#f8fafb] px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">档位定位说明</p>
              <div className="mt-2 grid gap-3 md:grid-cols-3">
                {["经济型", "舒适型", "高端型"].map((tier) => {
                  const colors = tierBadgeColors[tier];
                  return (
                    <div key={tier} className="flex gap-2">
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${colors.badge}`} />
                      <div>
                        <span className="text-xs font-semibold text-ink">{tierProfiles[tier].label}</span>
                        <span className="text-xs text-slate-500"> — {tierProfiles[tier].tagline}</span>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">{tierProfiles[tier].sellingPoint}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* 三档对比卡片 */}
            <div className="grid gap-4 md:grid-cols-3">
              {threePlans.map((plan) => {
                const colors = tierBadgeColors[plan.tier];
                const isSelected = plan.tier === selectedTier;
                return (
                  <button
                    key={plan.tier}
                    type="button"
                    onClick={() => setSelectedTier(plan.tier)}
                    className={`text-left border-2 transition ${
                      isSelected
                        ? plan.tier === "高端型"
                          ? `border-amber-400 bg-gradient-to-b from-amber-50/70 to-white shadow-[0_0_12px_rgba(217,165,32,0.18)]`
                          : `${colors.border} ${colors.bg} shadow-sm`
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className={`px-4 py-2 ${isSelected ? colors.badge : "bg-slate-400"} text-white`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold flex items-center gap-1.5">
                          {plan.tier === "高端型" && <Crown size={13} />}
                          {plan.profile.label}
                        </span>
                        {isSelected && <Check size={14} />}
                      </div>
                      <span className="text-[11px] opacity-90">{plan.profile.tagline}</span>
                    </div>
                    <div className="px-4 py-4">
                      <p className={`text-2xl font-bold ${plan.tier === "高端型" && isSelected ? "text-amber-700" : "text-ink"}`}>{plan.perPersonPrice || plan.totalPrice}</p>
                      <p className="mb-1 text-[11px] text-slate-500">人均参考 · 整团 {plan.totalPrice}</p>
                      <p className={`mb-3 inline-block text-[10px] px-1.5 py-0.5 font-medium ${
                        plan.tier === "高端型" ? "bg-amber-100 text-amber-700" : plan.tier === "舒适型" ? "bg-fjord/10 text-fjord" : "bg-slate-100 text-slate-500"
                      }`}>
                        {plan.profile.recommendation}
                      </p>
                      <div className="space-y-1.5 text-xs text-slate-600">
                        {plan.featureRows.slice(0, 3).map(([label, value]) => (
                          <div key={label} className="flex gap-1">
                            <span className="shrink-0 text-slate-400">·</span>
                            <span>
                              <span className="font-semibold text-slate-700">{label}：</span>
                              {value}
                            </span>
                          </div>
                        ))}
                        <p className="pt-1 text-[11px] text-fjord font-semibold">
                          {isSelected ? "▼ 当前查看" : "点击查看详情 →"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 签发机构和备注 */}
            <div className="border border-slate-200 bg-[#f8fafb] px-4 py-3 text-sm leading-6 text-slate-700">
              <div className="grid gap-2 md:grid-cols-2">
                <p>
                  <strong className="text-ink">签发机构：</strong>
                  {agencyProfile.name} / {agencyProfile.chineseName}
                </p>
                <p>
                  <strong className="text-ink">联系邮箱：</strong>
                  {agencyProfile.email}
                </p>
              </div>
              <p className="mt-2">
                <strong className="text-ink">备注说明：</strong>
                {documentData.metadata.remarks}
              </p>
            </div>

            {/* 选中档位的完整方案详情 */}
            <div className="border-t border-slate-200 pt-4">
              <div className="mb-4 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white ${tierBadgeColors[selectedTier].badge}`}>
                  {tierProfiles[selectedTier].label}
                </span>
                <span className="text-xs text-slate-500">完整方案详情</span>
              </div>
              {documentData.sections.map((section) => (
                <DocumentSection key={section.id} section={section} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function DocumentSection({ section }) {
  const Icon = section.icon;
  const collapsibleIds = ["hotel", "invitation"];
  const isCollapsible = collapsibleIds.includes(section.id);
  const [collapsed, setCollapsed] = useState(isCollapsible);

  return (
    <article className="border border-slate-200 bg-white">
      <div
        className={`flex items-center gap-2 border-b border-slate-200 bg-ledger px-4 py-3 ${isCollapsible ? "cursor-pointer hover:bg-[#e8edee] transition select-none" : ""}`}
        onClick={isCollapsible ? () => setCollapsed((c) => !c) : undefined}
      >
        <span className="flex h-8 w-8 items-center justify-center bg-white text-fjord ring-1 ring-slate-200">
          <Icon size={17} />
        </span>
        <h3 className="text-sm font-semibold text-ink">{section.title}</h3>
        {isCollapsible && (
          <span className={`ml-auto text-slate-400 transition ${collapsed ? "" : "rotate-180"}`}>
            <ChevronDown size={16} />
          </span>
        )}
      </div>

      {!collapsed && (
        section.letter ? (
          <LetterBody letter={section.letter} />
        ) : (
          <div className="p-4">
            <div className="overflow-x-auto">
            <dl className="grid gap-0 overflow-hidden border border-slate-200 md:grid-cols-2">
              {section.rows.map(([label, value]) => (
                <div
                  key={`${section.id}-${label}`}
                  className="grid grid-cols-[112px_minmax(0,1fr)] border-b border-slate-200 md:border-r even:md:border-r-0"
                >
                  <dt className="bg-[#f4f7f8] px-3 py-2 text-xs font-semibold text-slate-700">{label}</dt>
                  <dd className="px-3 py-2 text-sm leading-6 text-slate-700">{value}</dd>
                </div>
              ))}
            </dl>
            </div>
            {section.clauses?.length ? (
              <ol className="mt-4 space-y-2 border-l-2 border-fjord/30 pl-4 text-sm leading-6 text-slate-700">
                {section.clauses.map((clause) => (
                  <li key={clause}>{clause}</li>
                ))}
              </ol>
            ) : null}
          </div>
        )
      )}
    </article>
  );
}

function LetterBody({ letter }) {
  return (
    <div className="bg-[#fbfcfc] p-5 text-sm leading-7 text-slate-700">
      <div className="border-b border-slate-300 pb-4">
        <p className="text-center text-base font-semibold tracking-[0.04em] text-ink">{letter.heading}</p>
        <p className="mt-4 font-semibold text-slate-800">{letter.recipient}</p>
        <p className="mt-1 font-semibold text-slate-800">{letter.subject}</p>
      </div>

      <div className="space-y-3 py-4">
        {letter.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="overflow-x-auto">
      <dl className="overflow-hidden border border-slate-200">
        {letter.table.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-slate-200 last:border-b-0">
            <dt className="bg-[#f4f7f8] px-3 py-2 text-xs font-semibold text-slate-700">{label}</dt>
            <dd className="px-3 py-2 text-sm text-slate-700">{value}</dd>
          </div>
        ))}
      </dl>
      </div>

      <p className="mt-4">{letter.closing}</p>
      <div className="mt-6 grid gap-1 border-t border-slate-300 pt-4 text-slate-700 sm:grid-cols-2">
        <p>
          <strong>Issued by:</strong> {agencyProfile.name}
        </p>
        <p>
          <strong>Contact:</strong> {agencyProfile.phone}
        </p>
        <p>
          <strong>Email:</strong> {agencyProfile.email}
        </p>
        <p>
          <strong>Authorized Dept.:</strong> {agencyProfile.contact}
        </p>
      </div>
    </div>
  );
}

function sectionToHtml(section) {
  if (section.letter) {
    return `
      <h2>${section.title}</h2>
      <h3>${section.letter.heading}</h3>
      <p><strong>${section.letter.recipient}</strong></p>
      <p><strong>${section.letter.subject}</strong></p>
      ${section.letter.paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("")}
      <table>
        ${section.letter.table
          .map(([label, value]) => `<tr><td class="label">${label}</td><td>${value}</td></tr>`)
          .join("")}
      </table>
      <p>${section.letter.closing}</p>
      <div class="signature">
        <p><strong>Issued by:</strong> ${agencyProfile.name}</p>
        <p><strong>Contact:</strong> ${agencyProfile.phone} / ${agencyProfile.email}</p>
      </div>
    `;
  }

  return `
    <h2>${section.title}</h2>
    <table>
      ${section.rows.map(([label, value]) => `<tr><td class="label">${label}</td><td>${value}</td></tr>`).join("")}
    </table>
    ${(section.clauses || []).map((clause) => `<p>${clause}</p>`).join("")}
  `;
}

export default App;
