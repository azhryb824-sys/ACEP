class SupplierAI {
  constructor() {
    this.suppliers = [
      {
        id: 'SA001',
        name: 'شركة الخرسانة المتقدمة',
        city: 'الرياض',
        region: 'الوسطى',
        specialty: 'Concrete',
        rating: 4.8,
        reliability: 0.95,
        deliveryDays: 3,
        priceFactor: 1.1,
        certifications: ['SASO', 'SBC', 'ISO 9001', 'ASTM'],
        notes: 'أفضل مورد خرسانة في المنطقة الوسطى'
      },
      {
        id: 'SA002',
        name: 'مصنع حديد السعودية',
        city: 'جدة',
        region: 'الغربية',
        specialty: 'Steel',
        rating: 4.6,
        reliability: 0.92,
        deliveryDays: 5,
        priceFactor: 1.0,
        certifications: ['SASO', 'ISO 9001', 'ISO 14001'],
        notes: 'أسعار تنافسية وجودة عالية'
      },
      {
        id: 'SA003',
        name: 'شركة الكهرباء الفنية',
        city: 'الدمام',
        region: 'الشرقية',
        specialty: 'Electrical',
        rating: 4.5,
        reliability: 0.88,
        deliveryDays: 4,
        priceFactor: 0.95,
        certifications: ['SASO', 'SBC', 'IEC'],
        notes: 'متخصصون في المواد الكهربائية'
      },
      {
        id: 'SA004',
        name: 'مؤسسة السباكة المحترفة',
        city: 'الرياض',
        region: 'الوسطى',
        specialty: 'Plumbing',
        rating: 4.3,
        reliability: 0.85,
        deliveryDays: 2,
        priceFactor: 0.85,
        certifications: ['SASO', 'SBC'],
        notes: 'أسعار منخفضة وتوصيل سريع'
      },
      {
        id: 'SA005',
        name: 'شركة التكييف المركزي',
        city: 'جدة',
        region: 'الغربية',
        specialty: 'HVAC',
        rating: 4.7,
        reliability: 0.9,
        deliveryDays: 6,
        priceFactor: 1.2,
        certifications: ['ISO 9001', 'ASHRAE', 'SASO'],
        notes: 'معدات تكييف عالية الجودة'
      },
      {
        id: 'SA006',
        name: 'مؤسسة التشطيب الحديث',
        city: 'الرياض',
        region: 'الوسطى',
        specialty: 'Finishing',
        rating: 4.4,
        reliability: 0.87,
        deliveryDays: 4,
        priceFactor: 0.9,
        certifications: ['SASO'],
        notes: 'مواد تشطيب متنوعة'
      },
      {
        id: 'SA007',
        name: 'شركة الأسمنت الوطنية',
        city: 'الهفوف',
        region: 'الشرقية',
        specialty: 'Concrete',
        rating: 4.2,
        reliability: 0.82,
        deliveryDays: 3,
        priceFactor: 0.8,
        certifications: ['SASO', 'ISO 9001'],
        notes: 'أسعار اقتصادية للأسمنت'
      },
      {
        id: 'SA008',
        name: 'مصنع الحديد المتفوق',
        city: 'الرياض',
        region: 'الوسطى',
        specialty: 'Steel',
        rating: 4.9,
        reliability: 0.97,
        deliveryDays: 4,
        priceFactor: 1.3,
        certifications: ['SASO', 'SBC', 'ISO 9001', 'ISO 14001', 'OHSAS'],
        notes: 'أفضل جودة حديد في المملكة'
      },
      {
        id: 'SA009',
        name: 'شركة الإضاءة المتكاملة',
        city: 'الخبر',
        region: 'الشرقية',
        specialty: 'Electrical',
        rating: 4.1,
        reliability: 0.8,
        deliveryDays: 3,
        priceFactor: 0.85,
        certifications: ['SASO', 'IEC'],
        notes: 'متخصصون في الإضاءة'
      },
      {
        id: 'SA010',
        name: 'مؤسسة المواسير العربية',
        city: 'جدة',
        region: 'الغربية',
        specialty: 'Plumbing',
        rating: 4.0,
        reliability: 0.78,
        deliveryDays: 4,
        priceFactor: 0.78,
        certifications: ['SASO'],
        notes: 'أقل أسعار للمواسير'
      },
      {
        id: 'SA011',
        name: 'شركة التبريد والتكييف',
        city: 'الرياض',
        region: 'الوسطى',
        specialty: 'HVAC',
        rating: 4.5,
        reliability: 0.89,
        deliveryDays: 5,
        priceFactor: 1.05,
        certifications: ['SASO', 'ASHRAE', 'ISO 9001'],
        notes: 'خدمة ما بعد البيع ممتازة'
      },
      {
        id: 'SA012',
        name: 'مؤسسة الدهانات العصرية',
        city: 'جدة',
        region: 'الغربية',
        specialty: 'Finishing',
        rating: 4.3,
        reliability: 0.84,
        deliveryDays: 3,
        priceFactor: 0.88,
        certifications: ['SASO', 'ISO 9001'],
        notes: 'دهانات عالية الجودة'
      },
      {
        id: 'SA013',
        name: 'شركة الخرسانة الجاهزة',
        city: 'مكة',
        region: 'الغربية',
        specialty: 'Concrete',
        rating: 4.0,
        reliability: 0.8,
        deliveryDays: 2,
        priceFactor: 0.82,
        certifications: ['SASO', 'SBC'],
        notes: 'توصيل سريع لمكة والمشاعر'
      },
      {
        id: 'SA014',
        name: 'مصنع الحديد الخفيف',
        city: 'الدمام',
        region: 'الشرقية',
        specialty: 'Steel',
        rating: 4.4,
        reliability: 0.86,
        deliveryDays: 5,
        priceFactor: 0.92,
        certifications: ['SASO', 'ISO 9001'],
        notes: 'متخصصون في الحديد الخفيف'
      },
      {
        id: 'SA015',
        name: 'شركة الأدوات الصحية الفاخرة',
        city: 'الرياض',
        region: 'الوسطى',
        specialty: 'Plumbing',
        rating: 4.7,
        reliability: 0.93,
        deliveryDays: 5,
        priceFactor: 1.35,
        certifications: ['SASO', 'SBC', 'ISO 9001', 'ISO 14001'],
        notes: 'أدوات صحية فاخرة ومستوردة'
      },
      {
        id: 'SA016',
        name: 'مؤسسة التكييف الشعبي',
        city: 'تبوك',
        region: 'الشمالية',
        specialty: 'HVAC',
        rating: 3.8,
        reliability: 0.75,
        deliveryDays: 7,
        priceFactor: 0.72,
        certifications: ['SASO'],
        notes: 'أسعار منخفضة للمشاريع الصغيرة'
      },
      {
        id: 'SA017',
        name: 'شركة التشطيب الذهبي',
        city: 'جدة',
        region: 'الغربية',
        specialty: 'Finishing',
        rating: 4.6,
        reliability: 0.91,
        deliveryDays: 6,
        priceFactor: 1.25,
        certifications: ['SASO', 'ISO 9001', 'ISO 14001'],
        notes: 'تشطيبات فاخرة للفلل والقصور'
      }
    ];

    this.basePrices = {
      Concrete: { 'الوسطى': 280, 'الغربية': 300, 'الشرقية': 270, 'الشمالية': 310, 'الجنوبية': 320 },
      Steel: { 'الوسطى': 3200, 'الغربية': 3300, 'الشرقية': 3100, 'الشمالية': 3500, 'الجنوبية': 3600 },
      Electrical: { 'الوسطى': 450, 'الغربية': 470, 'الشرقية': 440, 'الشمالية': 500, 'الجنوبية': 510 },
      Plumbing: { 'الوسطى': 180, 'الغربية': 190, 'الشرقية': 175, 'الشمالية': 210, 'الجنوبية': 220 },
      HVAC: { 'الوسطى': 2500, 'الغربية': 2600, 'الشرقية': 2450, 'الشمالية': 2800, 'الجنوبية': 2900 },
      Finishing: { 'الوسطى': 120, 'الغربية': 130, 'الشرقية': 115, 'الشمالية': 140, 'الجنوبية': 150 }
    };
  }

  findSuppliers(material, region, maxPrice, minRating = 1) {
    let results = this.suppliers.filter(s =>
      (material ? s.specialty === material : true) &&
      (region ? s.region === region : true) &&
      s.rating >= minRating
    );

    if (maxPrice) {
      const base = this.basePrices[material]?.[region];
      if (base) {
        results = results.filter(s => base * s.priceFactor <= maxPrice);
      }
    }

    return results.map(s => ({
      ...s,
      السعر_التقديري: this._calcPrice(material, region, s)
    }));
  }

  compareSuppliers(supplierIds) {
    const selected = this.suppliers.filter(s => supplierIds.includes(s.id));
    if (selected.length === 0) return [];

    return selected.map(s => {
      const score = this._calculateOverallScore(s);
      return {
        الاسم: s.name,
        التقييم: s.rating,
        الموثوقية: `${(s.reliability * 100).toFixed(0)}%`,
        السعر: s.priceFactor,
        مدة_التوريد: `${s.deliveryDays} أيام`,
        الشهادات: s.certifications.join('، '),
        التوصية: score >= 0.8 ? 'موصى به بشدة' : score >= 0.6 ? 'موصى به' : 'اختيار متوسط'
      };
    });
  }

  getBestSupplier(material, region, criteria = {}) {
    const weights = {
      price: criteria.price ?? 0.3,
      quality: criteria.quality ?? 0.25,
      reliability: criteria.reliability ?? 0.2,
      delivery: criteria.delivery ?? 0.15,
      certifications: criteria.certifications ?? 0.1
    };

    const candidates = this.suppliers.filter(s => s.specialty === material && (region ? s.region === region : true));
    if (candidates.length === 0) return null;

    const scored = candidates.map(s => {
      const base = this.basePrices[material]?.[region] || 300;
      const priceScore = 1 - ((s.priceFactor - 0.7) / 0.8);
      const qualityScore = s.rating / 5;
      const reliabilityScore = s.reliability;
      const deliveryScore = 1 - ((s.deliveryDays - 1) / 13);
      const certScore = Math.min(s.certifications.length / 5, 1);

      const total =
        weights.price * priceScore +
        weights.quality * qualityScore +
        weights.reliability * reliabilityScore +
        weights.delivery * deliveryScore +
        weights.certifications * certScore;

      return {
        المورد: s,
        النتيجة_الإجمالية: Number(total.toFixed(3)),
        تفاصيل_المعايير: {
          السعر: Number(priceScore.toFixed(3)),
          الجودة: Number(qualityScore.toFixed(3)),
          الموثوقية: Number(reliabilityScore.toFixed(3)),
          التوصيل: Number(deliveryScore.toFixed(3)),
          الشهادات: Number(certScore.toFixed(3))
        },
        السعر_التقديري: base * s.priceFactor
      };
    });

    scored.sort((a, b) => b.النتيجة_الإجمالية - a.النتيجة_الإجمالية);
    return scored[0];
  }

  getPriceEstimate(material, region) {
    const base = this.basePrices[material]?.[region];
    if (!base) return null;

    const suppliers = this.suppliers.filter(s => s.specialty === material && s.region === region);
    if (suppliers.length === 0) return null;

    const prices = suppliers.map(s => base * s.priceFactor);
    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return {
      material,
      region,
      unitPrice: base,
      minPrice: Number(min.toFixed(2)),
      avgPrice: Number(avg.toFixed(2)),
      maxPrice: Number(max.toFixed(2)),
      supplierCount: suppliers.length,
      currency: 'SAR',
      المادة: material,
      المنطقة: region,
      السعر_الأساسي: base,
      أقل_سعر: Number(min.toFixed(2)),
      متوسط_السعر: Number(avg.toFixed(2)),
      أعلى_سعر: Number(max.toFixed(2)),
      عدد_الموردين: suppliers.length,
      عملة: 'ريال سعودي'
    };
  }

  getSupplierHeatmap(material) {
    const suppliers = this.suppliers.filter(s => s.specialty === material);
    const regions = {};

    suppliers.forEach(s => {
      if (!regions[s.region]) {
        regions[s.region] = { المنطقة: s.region, عدد_الموردين: 0, متوسط_السعر: 0, متوسط_التقييم: 0, موردون: [] };
      }
      regions[s.region].عدد_الموردين++;
      regions[s.region].موردون.push(s.name);
    });

    Object.keys(regions).forEach(r => {
      const group = suppliers.filter(s => s.region === r);
      const base = this.basePrices[material]?.[r] || 300;
      const prices = group.map(s => base * s.priceFactor);
      regions[r].متوسط_السعر = Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2));
      regions[r].متوسط_التقييم = Number((group.reduce((a, b) => a + b.rating, 0) / group.length).toFixed(2));
    });

    return {
      المادة: material,
      المناطق: Object.values(regions).sort((a, b) => b.عدد_الموردين - a.عدد_الموردين),
      إجمالي_الموردين: suppliers.length
    };
  }

  analyzeProposal(supplierId, quantity) {
    const supplier = this.suppliers.find(s => s.id === supplierId);
    if (!supplier) return null;

    const base = this.basePrices[supplier.specialty]?.[supplier.region] || 300;
    const unitPrice = base * supplier.priceFactor;
    const totalPrice = unitPrice * quantity;
    const marketAvg = base * 1;
    const savings = (marketAvg - unitPrice) * quantity;

    const score = this._calculateOverallScore(supplier);
    const riskLevel = supplier.reliability >= 0.9 ? 'منخفض' : supplier.reliability >= 0.8 ? 'متوسط' : 'مرتفع';

    return {
      ملخص_العرض: {
        المورد: supplier.name,
        المادة: supplier.specialty,
        الكمية: quantity,
        سعر_الوحدة: Number(unitPrice.toFixed(2)),
        السعر_الإجمالي: Number(totalPrice.toFixed(2)),
        العملة: 'ريال سعودي'
      },
      تحليل_السعر: {
        مقارنة_بمتوسط_السوق: `${((supplier.priceFactor - 1) * 100).toFixed(1)}%`,
        التوفير_المتوقع: Number(savings.toFixed(2)),
        مؤشر_السعر: supplier.priceFactor <= 0.9 ? 'منخفض' : supplier.priceFactor <= 1.1 ? 'متوسط' : 'مرتفع'
      },
      تقييم_المورد: {
        التقييم_العام: supplier.rating,
        الموثوقية: `${(supplier.reliability * 100).toFixed(0)}%`,
        مدة_التوريد: `${supplier.deliveryDays} أيام`,
        الشهادات: supplier.certifications,
        مستوى_المخاطرة: riskLevel,
        النتيجة_الكلية: Number(score.toFixed(3))
      },
      التوصية: score >= 0.8
        ? 'مورد ممتاز - يوصى بالتعاقد'
        : score >= 0.6
          ? 'مورد جيد - يوصى مع مراقبة الأداء'
          : 'مورد متوسط - يفضل البحث عن بدائل',
      ملاحظات: supplier.notes
    };
  }

  _calculateOverallScore(supplier) {
    const priceScore = 1 - ((supplier.priceFactor - 0.7) / 0.8);
    const qualityScore = supplier.rating / 5;
    const reliabilityScore = supplier.reliability;
    const deliveryScore = 1 - ((supplier.deliveryDays - 1) / 13);
    const certScore = Math.min(supplier.certifications.length / 5, 1);

    return (
      0.3 * priceScore +
      0.25 * qualityScore +
      0.2 * reliabilityScore +
      0.15 * deliveryScore +
      0.1 * certScore
    );
  }

  _calcPrice(material, region, supplier) {
    const base = this.basePrices[material]?.[region];
    if (!base) return null;
    return base * supplier.priceFactor;
  }
}

module.exports = SupplierAI;
