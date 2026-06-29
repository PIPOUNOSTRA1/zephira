const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

let useLocalMockDB = false;
let pool = null;
const mockDbPath = path.join(__dirname, 'db.json');

// Define collections seed
const defaultCollections = [
  {
    id: 1,
    slug: 'algerian-caftans',
    name_ar: 'القفطان الجزائري الفاخر',
    name_en: 'Luxury Algerian Caftans',
    description_ar: 'مجموعة القفطان الجزائري الفاخر - قفاطين راقية للمناسبات والأعراس تعكس أصالة التراث الجزائري العريق بتطريزات ذهبية فريدة',
    description_en: 'Luxury Algerian Caftans Collection - Premium caftans for weddings and special occasions reflecting the heritage of Algerian craftsmanship with golden embroidery.',
    image_url: '/images/collection_caftans.png'
  },
  {
    id: 2,
    slug: 'algerian-karakou',
    name_ar: 'الكاراكو العاصمي التقليدي',
    name_en: 'Traditional Algerian Karakou',
    description_ar: 'مجموعة الكاراكو العاصمي - أناقة عاصمية خالدة تجمع بين سترة المخمل المطرزة بالفتلة والبنطلون الحريري لإطلالة متميزة',
    description_en: 'Traditional Algerian Karakou Collection - Timeless Algiers elegance combining embroidered velvet jackets with silk pants/skirts for a royal look.',
    image_url: '/images/collection_karakou.png'
  },
  {
    id: 3,
    slug: 'bridal-special',
    name_ar: 'مجموعة العرائس والأفراح',
    name_en: 'Bridal & Wedding Special',
    description_ar: 'مجموعة العرائس والأفراح - قفاطين وكاراكو مصممة خصيصاً للعروس لتتألق في ليلة العمر بأفخم التطريزات وأرقى الأقمشة',
    description_en: 'Bridal & Wedding Special Collection - Exquisite caftans and karakous custom-tailored for brides to shine on their special day.',
    image_url: '/images/collection_bridal.png'
  }
];

// Define 10 Traditional Algerian Costumes seed with multi-image gallery paths
const defaultProducts = [
  {
    id: 1,
    slug: 'emerald-royal-caftan',
    name_ar: 'القفطان الملكي الأخضر',
    name_en: 'Emerald Royal Caftan',
    description_ar: 'قفطان ملكي جزائري فاخر من قطيفة الجينز الأصلية، مطرز يدوياً بالخيط الذهبي الفاخر ومزين بالأحجار الكريمة اللامعة. يأتي مع حزام ذهبي منسق لإطلالة أنيقة في الأعراس والمناسبات السعيدة.',
    description_en: 'A luxurious royal Algerian Caftan made of authentic velvet, hand-embroidered with premium gold thread and decorated with sparkling gems. Comes with a matching gold belt for an elegant look at weddings.',
    price: 48000.00,
    old_price: 75000.00,
    image_url: '/images/emerald_caftan.png',
    images: ['/images/emerald_caftan.png', '/images/royal_blue_karakou.png', '/images/burgundy_caftan.png'],
    collection_id: 1,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Emerald Green', 'Gold'],
    is_featured: true,
    in_stock: true,
    fabric_ar: 'قطيفة الجينز الفاخرة (Velvet) المستوردة خصيصاً، مع بطانة داخلية ناعمة من الحرير الساتاني لراحة تامة.',
    fabric_en: 'Premium heavy velvet fabric, lined with soft satin silk for maximum comfort and structure.',
    design_story_ar: 'يجسد هذا التصميم الهيبة والملكية. تم تصميمه للعروس التي تبحث عن إطلالة تجمع بين فخامة التراث العريق وسحر ليلة العمر، لتكون نجمة متلألئة بين الحضور.',
    design_story_en: 'Inspired by the royal Algerian courts, this caftan evokes majesty and pride, custom tailored for brides wanting to represent absolute heritage on their wedding night.',
    embroidery_ar: 'تطريز يدوي بالفتلة والمجبود الذهبي المتقن، بنقوش جزائرية كلاسيكية مع تركيب يدوي للخرز اللامع والعقاد.',
    embroidery_en: 'Hand-embroidered using traditional gold Fetla and Majboud techniques with sparkling crystal beads and hand-braided Aakad buttons.'
  },
  {
    id: 2,
    slug: 'royal-blue-karakou',
    name_ar: 'كاراكو عاصمي أزرق ملكي',
    name_en: 'Algiers Royal Blue Karakou',
    description_ar: 'كاراكو عاصمي جزائري يجمع بين الحداثة والأصالة. سترة من المخمل الفاخر مطرزة يدوياً بالفتلة العاصمية الكلاسيكية، مع سروال الشلقة من الحرير الطبيعي الانسيابي.',
    description_en: 'A traditional Algerian Karakou combining modernity and heritage. High-quality velvet jacket hand-embroidered with classic Algiers Fetla, paired with flowing natural silk Chelka trousers.',
    price: 65000.00,
    old_price: 95000.00,
    image_url: '/images/royal_blue_karakou.png',
    images: ['/images/royal_blue_karakou.png', '/images/emerald_caftan.png', '/images/white_bridal_karakou.png'],
    collection_id: 2,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Royal Blue', 'White'],
    is_featured: true,
    in_stock: true,
    fabric_ar: 'سترة من القطيفة الفاخرة باللون الأزرق الملكي، مقترنة مع سروال الشلقة من حرير الكريب الطبيعي الانسيابي.',
    fabric_en: 'Royal blue velvet jacket combined with high-grade flowing natural silk crepe for the Chelka trousers.',
    design_story_ar: 'كاراكو الجزائر العاصمة هو فخر الهوية. يروي هذا الموديل قصة الأناقة العاصمية التي تتناقلها العائلات كإرث خالد للمناسبات الفخمة والأفراح.',
    design_story_en: 'A celebration of Algiers high fashion. This Karakou represents the timeless urban elegance of the Algerian capital, traditionally worn by noblewomen.',
    embroidery_ar: 'تطريز "الفتلة" اليدوي بخيوط ذهبية خالصة تحاكي طيور الجنة وأزهار الياسمين الدمشقية التقليدية.',
    embroidery_en: 'Intricate hand-made Fetla embroidery depicting jasmine patterns and traditional symbols of beauty using metallic gold threads.'
  },
  {
    id: 3,
    slug: 'white-bridal-karakou',
    name_ar: 'كاراكو العروس الأبيض المذهب',
    name_en: 'White Bridal Majesty Karakou',
    description_ar: 'كاراكو العروس الأبيض الفخم، مصمم خصيصاً لليلة الزفاف والخطوبة. سترة مخملية بيضاء ناصعة مطرزة بالخيوط الذهبية والخرز اللامع مع سروال مدور من الحرير الفاخر.',
    description_en: 'A luxurious white bridal Karakou, custom-designed for wedding and engagement nights. Bright white velvet jacket embroidered with gold thread and shiny beads, paired with a rounded skirt made of premium silk.',
    price: 85000.00,
    old_price: 120000.00,
    image_url: '/images/white_bridal_karakou.png',
    images: ['/images/white_bridal_karakou.png', '/images/royal_blue_karakou.png', '/images/emerald_caftan.png'],
    collection_id: 3,
    sizes: ['S', 'M', 'L'],
    colors: ['Bridal White', 'Gold'],
    is_featured: true,
    in_stock: true,
    fabric_ar: 'سترة مخملية بيضاء ناصعة، وسروال مدور فسيح من الحرير الطبيعي الإيطالي الثقيل.',
    fabric_en: 'Pure white premium velvet jacket combined with Italian heavy silk for the traditional rounded trousers (Seroual Mdouer).',
    design_story_ar: 'صمم هذا الكاراكو ليكون جوهرة ليلة العمر. البياض الناصع مع بريق الخيوط الذهبية يعكس نقاء وفخامة العروس الجزائرية في أسعد ليالي حياتها.',
    design_story_en: 'Crafted specifically as a masterwork for brides, combining pure bridal white and brilliant gold to represent purity and prestige in Algerian marriage traditions.',
    embroidery_ar: 'تطريز كثيف وثقيل بالفتلة والمجبود والخرز الكريستالي اللامع، تم تنفيذه يدوياً بحرفية استغرقت أكثر من 60 ساعة من العمل.',
    embroidery_en: 'Heavy, dense hand-embroidery using gold thread, pearls, and crystals, requiring over 60 hours of dedicated manual craftsmanship.'
  },
  {
    id: 4,
    slug: 'burgundy-velvet-caftan',
    name_ar: 'القفطان المخملي الخمري',
    name_en: 'Burgundy Velvet Caftan',
    description_ar: 'قفطان جزائري مذهل بلون خمري دافئ وجذاب. مصنوع من المخمل الفاخر ومطرز بالخيوط الذهبية بتفاصيل دقيقة تنساب على الأطراف والأكمام، مثالي للسهرات والمناسبات العائلية الراقية.',
    description_en: 'A stunning Algerian Caftan in a warm and attractive burgundy color. Crafted from luxury velvet and embroidered with gold threads in meticulous details along the edges and sleeves, perfect for evening gatherings.',
    price: 42000.00,
    old_price: 68000.00,
    image_url: '/images/burgundy_caftan.png',
    images: ['/images/burgundy_caftan.png', '/images/emerald_caftan.png', '/images/white_bridal_karakou.png'],
    collection_id: 1,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Burgundy', 'Gold'],
    is_featured: false,
    in_stock: true,
    fabric_ar: 'قطيفة فرنسية فاخرة وناعمة الملمس ذات لمعان جذاب باللون الخمري المتميز.',
    fabric_en: 'Premium French velvet with a deep burgundy shade and soft texture that reflects light elegantly.',
    design_story_ar: 'يعبر اللون الخمري عن الدفء والوقار. تم تصميم هذا القفطان ليمزج بين هيبة التراث التاريخي والنعومة العصرية، ليكون الخيار الأفضل لسهراتكِ السعيدة.',
    design_story_en: 'Designed for evening warmth, this caftan blends historical prestige with modern modesty, perfect for family ceremonies and elegant gatherings.',
    embroidery_ar: 'تطريز ذهبي دقيق وناعم على الصدر والأكمام مع أحزمة المحزمة التقليدية وعقاد منسقة يدوياً بالكامل.',
    embroidery_en: 'Delicate gold thread embroidery on collar, sleeves, and chest, finished with hand-crafted buttons (Aakad) and a matching waist belt.'
  },
  {
    id: 5,
    slug: 'chedda-tlemcen-majesty',
    name_ar: 'الشدة التلمسانية السلطانية',
    name_en: 'Tlemcen Royal Bridal Chedda',
    description_ar: 'الشدة التلمسانية الأسطورية، اللباس الأكثر فخامة وعراقة لعروس غرب الجزائر والمصنف عالمياً لدى اليونسكو. تفاصيل ملكية تشمل القفطان المطرز والسترة المذهبة وتاج الجوهر.',
    description_en: 'The legendary Tlemcen Chedda, the most prestigious traditional bridal attire of Western Algeria, registered by UNESCO. Absolute royalty including embroidered caftan, gold vest, and pearl headwear.',
    price: 95000.00,
    old_price: 140000.00,
    image_url: '/images/emerald_caftan.png',
    images: ['/images/emerald_caftan.png', '/images/white_bridal_karakou.png', '/images/burgundy_caftan.png'],
    collection_id: 3,
    sizes: ['S', 'M', 'L'],
    colors: ['Gold', 'Royal Red'],
    is_featured: true,
    in_stock: true,
    fabric_ar: 'مزيج ملكي من الحرير البروكار المذهب، سترة مخملية ثقيلة (الستة) وأقمشة الدانتيل والساتان الفاخر.',
    fabric_en: 'A royal blend of gold brocade silk, heavy velvet jacket, traditional laces, and finest under-linings.',
    design_story_ar: 'الشدة التلمسانية ليست مجرد فستان بل هي إرث حضاري مصنف كإرث إنساني. تعود أصولها لملوك تلمسان، وتمنح العروس طلّة سلطانية تجعلها ملكة متوجة بحق.',
    design_story_en: 'Classified by UNESCO, Tlemcen Chedda is a cultural treasure dating back to the royal dynasties of Tlemcen, creating an unforgettable queenly presence for the bride.',
    embroidery_ar: 'تطريز كثيف بالفتلة والمجبود والكنتير الذهبي الأصيل، مع حبات الجوهر الحقيقية المصنفة يدوياً حبة حبة.',
    embroidery_en: 'Heavy traditional embroidery using authentic gold Majboud, Kentir, and real pearls stitched onto the fabrics manually.'
  },
  {
    id: 6,
    slug: 'algiers-badroune-elegance',
    name_ar: 'البدرون العاصمي الحريري',
    name_en: 'Algiers Badroune Silk Elegance',
    description_ar: 'البدرون العاصمي المتميز بقصته الانسيابية التي تبرز رشاقة المرأة وجاذبيتها. سترة متصلة مطرزة بالفتلة الرقيقة تتدفق إلى الأسفل بنعومة الحرير الراقي.',
    description_en: 'The Algiers Badroune featuring a sleek, flowing design that enhances feminine grace. Styled with delicate gold Fetla embroidery flowing into smooth silk trousers.',
    price: 38000.00,
    old_price: 55000.00,
    image_url: '/images/royal_blue_karakou.png',
    images: ['/images/royal_blue_karakou.png', '/images/white_bridal_karakou.png', '/images/emerald_caftan.png'],
    collection_id: 2,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Creamy Ivory'],
    is_featured: false,
    in_stock: true,
    fabric_ar: 'حرير كريب طبيعي ناعم ومريح مقترن بلمسات مخملية خفيفة على الياقة والكتف.',
    fabric_en: 'Natural silk crepe and flowing satin, with subtle velvet details along the shoulders and borders.',
    design_story_ar: 'ابتكر البدرون ليكون عنواناً للحداثة الممزوجة بأصالة قصبة الجزائر. إنه اللباس المفضّل للعروس للاستقبال أو السهرة بفضل قصته المريحة والأنيقة.',
    design_story_en: 'Created as a bridge between tradition and modernity. Algiers Badroune is highly favored by modern brides for its lightweight, elegant silhouette.',
    embroidery_ar: 'تطريز "الفتلة" الذهبي الرقيق على الصدر والأكمام مع لمسة ناعمة من العقاد التقليدية.',
    embroidery_en: 'Delicate gold Fetla threads hand-guided on the collar and chest area with traditional hand-wrapped buttons.'
  },
  {
    id: 7,
    slug: 'chaoui-djebba-aures',
    name_ar: 'الجبة الشاوية الأوراسية',
    name_en: 'Chaoui Djebba of Aurès',
    description_ar: 'الجبة الشاوية الفخمة التي ترمز لشموخ جبال الأوراس وعزة المرأة الأوراسية الحرة. تتميز بالألوان الحيوية والرموز الأمازيغية العريقة وتصميم مريح وأنيق.',
    description_en: 'The magnificent Chaoui Djebba representing the pride of the Aurès mountains. Characterized by vibrant colors, ancestral Amazigh symbols, and a majestic fit.',
    price: 32000.00,
    old_price: 48000.00,
    image_url: '/images/burgundy_caftan.png',
    images: ['/images/burgundy_caftan.png', '/images/emerald_caftan.png', '/images/royal_blue_karakou.png'],
    collection_id: 1,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Midnight Black', 'Royal Red'],
    is_featured: false,
    in_stock: true,
    fabric_ar: 'قطيفة خفيفة وناعمة (Velvet) مقترنة بأشرطة ملونة منسوجة يدوياً.',
    fabric_en: 'Soft lightweight velvet paired with colorful hand-woven Berber ribbons.',
    design_story_ar: 'تحمل الجبة الشاوية تاريخ ثورة الأوراس وشموخ جبالها. الألوان والتطريز يرمزان للفرح والحياة الأمازيغية الحرة، وهي تعبير عن القوة والجمال الأصيل.',
    design_story_en: 'Representing the historic mountains of Aurès. Its vibrant borders symbolize joy, nature, and the free-spirited Amazigh lifestyle.',
    embroidery_ar: 'تطريز كثيف بالخيوط الحريرية اللامعة ورسومات الحلي البربرية الفضية التقليدية (الخلالة) والخرز.',
    embroidery_en: 'Vibrant thread embroidery (Sorsar) copying traditional Berber jewelry motifs and protective silver symbols.'
  },
  {
    id: 8,
    slug: 'constantine-fergani-velvet',
    name_ar: 'الجبة القسنطينية الفرقاني',
    name_en: 'Constantine Djebba Fergani',
    description_ar: 'الجبة القسنطينية الأصلية (الفرقاني)، اللباس الأكثر فخامة في الشرق الجزائري. مخمل ملكي ثقيل مطرز بالكامل بخيوط المجبود الذهبية بنقوش الطاووس والأزهار الأسطورية.',
    description_en: 'The authentic Constantine Djebba (Fergani), the peak of eastern Algerian luxury. Heavy royal velvet fully embroidered with golden Majboud depicting peacock and floral patterns.',
    price: 88000.00,
    old_price: 130000.00,
    image_url: '/images/burgundy_caftan.png',
    images: ['/images/burgundy_caftan.png', '/images/white_bridal_karakou.png', '/images/emerald_caftan.png'],
    collection_id: 3,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Imperial Burgundy', 'Emerald Green'],
    is_featured: true,
    in_stock: true,
    fabric_ar: 'قطيفة جنوة الأصلية الثقيلة المستوردة خصيصاً لتحمل التطريز الذهبي الكثيف والخرز الكريستالي.',
    fabric_en: 'Heavy authentic Genoa velvet, specifically selected to support the dense gold embroidery and crystal weights.',
    design_story_ar: 'الفرقاني هو قطعة إرث تاريخية تتناقلها الأمهات للفتيات ككنز عائلي. يرمز إلى الوقار والجاه، وتألقكِ به يجعلكِ ترتدين قطعة من عمق التاريخ الجزائري.',
    design_story_en: 'A heirloom masterpiece passed down from mother to daughter. The Fergani represents dignity, status, and centuries of Constantine art and royalty.',
    embroidery_ar: 'تطريز يدوي مكثف بالذهب الخالص (المجبود والفتلة)، يغطي الصدر والكتف والأطراف بنقوش الطاووس والورود التاريخية.',
    embroidery_en: 'Dense, manual gold thread embroidery (Majboud) covering the front, chest, and borders with classic peacock and rose motifs.'
  },
  {
    id: 9,
    slug: 'kabyle-traditional-dress',
    name_ar: 'الجبة القبائلية الأمازيغية',
    name_en: 'Traditional Kabyle Djeba',
    description_ar: 'الجبة القبائلية بألوانها الزاهية المشرقة التي ترمز لجمال طبيعة بلاد القبائل وجبال جرجرة. تأتي مع الحزام الحريري التقليدي والشرائط المنسوجة باليد.',
    description_en: 'The traditional Kabyle Djeba with bright, cheerful colors representing the nature of Kabylie. Includes the classic woven silk belt and colorful hand-guided patterns.',
    price: 28000.00,
    old_price: 42000.00,
    image_url: '/images/white_bridal_karakou.png',
    images: ['/images/white_bridal_karakou.png', '/images/royal_blue_karakou.png', '/images/burgundy_caftan.png'],
    collection_id: 1,
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Bridal White', 'Bright Yellow'],
    is_featured: false,
    in_stock: true,
    fabric_ar: 'قطن طبيعي خفيف وصحي مقترن بالحرير والشرائط الملونة لراحة تامة.',
    fabric_en: 'Premium lightweight cotton, mixed with silk ribbons and traditional colorful braids.',
    design_story_ar: 'تروي الجبة القبائلية قصة ارتباط الأمازيغ بأرضهم وهويتهم العريقة. تعبر ألوان الأشرطة (الأصفر والأخضر والأحمر) عن الشمس والطبيعة والثورة والأمل.',
    design_story_en: 'Every ribbon on the Kabyle dress tells a story of identity and attachment to the Amazigh land. Colors reflect the sun, fertility, and hope.',
    embroidery_ar: 'تطريز يدوي ناعم ومتقاطع مع دمج شرائط الدانتيل والأشرطة الملونة الزاهية (الزيغزاغ) على الصدر والأطراف.',
    embroidery_en: 'Detailed geometric patterns created using traditional colorful zigzag ribbons and fine hand-woven braids.'
  },
  {
    id: 10,
    slug: 'naili-princess-dress',
    name_ar: 'الفستان النايلي الأصيل',
    name_en: 'Naili Princess Steppe Dress',
    description_ar: 'الفستان النايلي التقليدي المتميز بنقائه ولونه الأبيض الناصع المنساب. يرمز للشهامة والوقار والجمال الصحراوي الراقي لمنطقة أولاد نايل بالهضاب العليا.',
    description_en: 'The traditional Naili attire, distinguished by its purity and flowing white layers. Symbolizing dignity, chivalry, and desert beauty of the highlands.',
    price: 35000.00,
    old_price: 52000.00,
    image_url: '/images/white_bridal_karakou.png',
    images: ['/images/white_bridal_karakou.png', '/images/emerald_caftan.png', '/images/royal_blue_karakou.png'],
    collection_id: 3,
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Pure White', 'Cream'],
    is_featured: false,
    in_stock: true,
    fabric_ar: 'شيفون فرنسي شفاف وناعم مع بطانة من الحرير الناعم لراحة فائقة وانسيابية في الحركة.',
    fabric_en: 'French chiffon and soft silk lining, layered to create fluid movement and steppe elegance.',
    design_story_ar: 'يعبر اللباس النايلي عن كرم وشهامة قبائل أولاد نايل. يتمايل الفستان برقة ونعومة مع كل خطوة للعروس ليمنحها طلّة هادئة وراقية تخطف الأنفاس.',
    design_story_en: 'Reflecting the nobility and hospitality of the Naili tribe. The dress sways gently with every step, creating a serene, breathable, and royal presence.',
    embroidery_ar: 'تطريز بالخيوط الفضية أو الذهبية الرقيقة والخرز المضيء وشرائط الدانتيل البيضاء المنسقة باليد.',
    embroidery_en: 'Fine silver or gold thread embroidery paired with white lace details, carefully hand-guided on the layers.'
  }
];

// Helper to manage JSON DB
function loadMockData() {
  try {
    if (!fs.existsSync(mockDbPath)) {
      const initialData = {
        collections: defaultCollections,
        products: defaultProducts,
        orders: []
      };
      fs.writeFileSync(mockDbPath, JSON.stringify(initialData, null, 2), 'utf8');
      return initialData;
    }
    const raw = fs.readFileSync(mockDbPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading mock database file:', err);
    return { collections: defaultCollections, products: defaultProducts, orders: [] };
  }
}

function saveMockData(data) {
  try {
    fs.writeFileSync(mockDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing to mock database file:', err);
  }
}

// Intercept Postgres Pool and Queries
if (!connectionString || connectionString.includes('ZAPHIRACOFTAN_database')) {
  console.warn('[WARNING] No valid DATABASE_URL or using Docker host outside container. Enabling Local Mock JSON DB mode.');
  useLocalMockDB = true;
} else {
  pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=disable') ? false : {
      rejectUnauthorized: false
    }
  });
}

async function runMigrations() {
  if (useLocalMockDB) {
    console.log('Mock Database: Local JSON Database initialized with 10 traditional costumes.');
    const currentData = loadMockData();
    // Force reset products and collections to use updated default seeds in code
    currentData.products = defaultProducts;
    currentData.collections = defaultCollections;
    saveMockData(currentData);
    return;
  }
  
  console.log('Database: Running migrations...');
  const client = await pool.connect();
  try {
    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`Migrations directory not found at ${migrationsDir}. Skipping.`);
      return;
    }
    
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
      
    for (const file of files) {
      console.log(`Database: Executing migration file: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Database: Migration ${file} executed successfully.`);
    }
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // rollback failed if no active txn
    }
    console.error('[WARNING] Database migration failed. Falling back to Local Mock JSON DB mode.', error);
    useLocalMockDB = true;
    const currentData = loadMockData();
    currentData.products = defaultProducts;
    currentData.collections = defaultCollections;
    saveMockData(currentData);
  } finally {
    if (client) client.release();
  }
}

// Mock query runner logic
function runMockQuery(text, params) {
  const data = loadMockData();
  const normalizedText = text.replace(/\s+/g, ' ').trim().toLowerCase();

  // 1. SELECT COUNT(*) FROM orders
  if (normalizedText.includes('select count(*) from orders')) {
    return { rows: [{ count: data.orders.length.toString() }] };
  }

  // 2. INSERT INTO orders
  if (normalizedText.startsWith('insert into orders')) {
    const newOrder = {
      order_id: params[0],
      customer_name: params[1],
      phone: params[2],
      alt_phone: params[3],
      city: params[4],
      region: params[5] || '',
      address: params[6],
      product_name: params[7],
      quantity: parseInt(params[8]) || 1,
      total_price: parseFloat(params[9]),
      status: params[10] || 'pending',
      payment_method: params[11] || 'COD',
      tiktok_event_id: params[12] || '',
      snap_event_id: params[13] || '',
      utm_source: params[14] || '',
      utm_medium: params[15] || '',
      utm_campaign: params[16] || '',
      notes: params[17] || '',
      product_id: params[18] ? parseInt(params[18]) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.orders.push(newOrder);
    saveMockData(data);
    return { rows: [newOrder] };
  }

  // 3. UPDATE orders
  if (normalizedText.startsWith('update orders')) {
    const status = params[0];
    const orderId = params[1];
    const idx = data.orders.findIndex(o => o.order_id === orderId);
    if (idx !== -1) {
      data.orders[idx].status = status;
      data.orders[idx].updated_at = new Date().toISOString();
      saveMockData(data);
      return { rows: [data.orders[idx]] };
    }
    return { rows: [] };
  }

  // 4. SELECT * FROM orders
  if (normalizedText.includes('select * from orders')) {
    let result = [...data.orders];
    
    if (normalizedText.includes('where status = $1')) {
      const statusFilter = params[0];
      result = result.filter(o => o.status === statusFilter);
    }
    
    result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    if (params.length >= 2) {
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      if (typeof limit === 'number' && typeof offset === 'number') {
        result = result.slice(offset, offset + limit);
      }
    }
    
    return { rows: result };
  }

  // 5. Analytics Stats Query
  if (normalizedText.includes('count(*) as total_orders') && normalizedText.includes('from orders')) {
    const orders = data.orders;
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const confirmed = orders.filter(o => ['confirmed', 'shipped', 'delivered'].includes(o.status)).length;
    const delivered = orders.filter(o => o.status === 'delivered').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const rto = orders.filter(o => o.status === 'rto').length;
    const pending = orders.filter(o => o.status === 'pending').length;

    return {
      rows: [{
        total_orders: totalOrders.toString(),
        total_revenue: totalRevenue.toString(),
        aov: aov.toString(),
        confirmed_orders: confirmed.toString(),
        delivered_orders: delivered.toString(),
        cancelled_orders: cancelled.toString(),
        rto_orders: rto.toString(),
        pending_orders: pending.toString()
      }]
    };
  }

  // 6. Top Cities Query
  if (normalizedText.includes('select city, count(*)') && normalizedText.includes('group by city')) {
    const cityCounts = {};
    data.orders.forEach(o => {
      if (!cityCounts[o.city]) {
        cityCounts[o.city] = { count: 0, revenue: 0 };
      }
      cityCounts[o.city].count += 1;
      cityCounts[o.city].revenue += parseFloat(o.total_price || 0);
    });

    const rows = Object.keys(cityCounts).map(city => ({
      city: city,
      count: cityCounts[city].count.toString(),
      revenue: cityCounts[city].revenue.toString()
    }));

    rows.sort((a, b) => parseInt(b.count) - parseInt(a.count));
    return { rows: rows.slice(0, 5) };
  }

  // 7. SELECT * FROM collections
  if (normalizedText.includes('select * from collections')) {
    if (normalizedText.includes('where slug = $1')) {
      const col = data.collections.find(c => c.slug === params[0]);
      return { rows: col ? [col] : [] };
    }
    return { rows: data.collections };
  }

  // 8. SELECT p.* (products fetch)
  if (normalizedText.includes('select p.*') && normalizedText.includes('from products')) {
    let result = data.products.map(p => {
      const col = data.collections.find(c => c.id === p.collection_id) || {};
      return {
        ...p,
        collection_name_ar: col.name_ar || '',
        collection_name_en: col.name_en || ''
      };
    });

    if (normalizedText.includes('p.slug = $1') || normalizedText.includes('where p.slug = $1')) {
      result = result.filter(p => p.slug === params[0]);
    }
    else if (normalizedText.includes('p.collection_id = $1')) {
      result = result.filter(p => p.collection_id === params[0]);
    }
    if (normalizedText.includes('p.is_featured = true')) {
      result = result.filter(p => p.is_featured === true);
    }

    result.sort((a, b) => b.id - a.id);
    return { rows: result };
  }

  // 9. INSERT/UPDATE/DELETE collection
  if (normalizedText.startsWith('insert into collections')) {
    const newCol = {
      id: data.collections.length > 0 ? Math.max(...data.collections.map(c => c.id)) + 1 : 1,
      slug: params[0],
      name_ar: params[1],
      name_en: params[2],
      description_ar: params[3] || '',
      description_en: params[4] || '',
      image_url: params[5] || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.collections.push(newCol);
    saveMockData(data);
    return { rows: [newCol] };
  }

  if (normalizedText.startsWith('update collections')) {
    const colId = parseInt(params[6]);
    const idx = data.collections.findIndex(c => c.id === colId);
    if (idx !== -1) {
      data.collections[idx] = {
        ...data.collections[idx],
        slug: params[0],
        name_ar: params[1],
        name_en: params[2],
        description_ar: params[3] || '',
        description_en: params[4] || '',
        image_url: params[5] || '',
        updated_at: new Date().toISOString()
      };
      saveMockData(data);
      return { rows: [data.collections[idx]] };
    }
    return { rows: [] };
  }

  if (normalizedText.startsWith('delete from collections')) {
    const colId = parseInt(params[0]);
    const idx = data.collections.findIndex(c => c.id === colId);
    if (idx !== -1) {
      const removed = data.collections.splice(idx, 1)[0];
      saveMockData(data);
      return { rows: [removed] };
    }
    return { rows: [] };
  }

  // 10. INSERT/UPDATE/DELETE products
  if (normalizedText.startsWith('insert into products')) {
    const newProd = {
      id: data.products.length > 0 ? Math.max(...data.products.map(p => p.id)) + 1 : 1,
      slug: params[0],
      name_ar: params[1],
      name_en: params[2],
      description_ar: params[3] || '',
      description_en: params[4] || '',
      price: parseFloat(params[5]),
      old_price: params[6] ? parseFloat(params[6]) : null,
      image_url: params[7],
      images: params[8] || [params[7]],
      collection_id: params[9] ? parseInt(params[9]) : null,
      video_url: params[10] || null,
      sizes: params[11] || ['S', 'M', 'L', 'XL', 'XXL'],
      colors: params[12] || [],
      in_stock: params[13] !== undefined ? params[13] : true,
      is_featured: params[14] !== undefined ? params[14] : false,
      fabric_ar: params[15] || '',
      fabric_en: params[16] || '',
      design_story_ar: params[17] || '',
      design_story_en: params[18] || '',
      embroidery_ar: params[19] || '',
      embroidery_en: params[20] || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    data.products.push(newProd);
    saveMockData(data);
    return { rows: [newProd] };
  }

  if (normalizedText.startsWith('update products')) {
    const prodId = parseInt(params[21]);
    const idx = data.products.findIndex(p => p.id === prodId);
    if (idx !== -1) {
      data.products[idx] = {
        ...data.products[idx],
        slug: params[0],
        name_ar: params[1],
        name_en: params[2],
        description_ar: params[3] || '',
        description_en: params[4] || '',
        price: parseFloat(params[5]),
        old_price: params[6] ? parseFloat(params[6]) : null,
        image_url: params[7],
        images: params[8] || [params[7]],
        collection_id: params[9] ? parseInt(params[9]) : null,
        video_url: params[10] || null,
        sizes: params[11] || ['S', 'M', 'L', 'XL', 'XXL'],
        colors: params[12] || [],
        in_stock: params[13] !== undefined ? params[13] : true,
        is_featured: params[14] !== undefined ? params[14] : false,
        fabric_ar: params[16] || '',
        fabric_en: params[17] || '',
        design_story_ar: params[18] || '',
        design_story_en: params[19] || '',
        embroidery_ar: params[20] || '',
        embroidery_en: params[21] || '',
        updated_at: new Date().toISOString()
      };
      saveMockData(data);
      return { rows: [data.products[idx]] };
    }
    return { rows: [] };
  }

  if (normalizedText.startsWith('delete from products')) {
    const prodId = parseInt(params[0]);
    const idx = data.products.findIndex(p => p.id === prodId);
    if (idx !== -1) {
      const removed = data.products.splice(idx, 1)[0];
      saveMockData(data);
      return { rows: [removed] };
    }
    return { rows: [] };
  }

  console.warn('[WARNING] Unhandled mock query:', text);
  return { rows: [] };
}

module.exports = {
  runMigrations,
  query: async (text, params) => {
    if (useLocalMockDB) {
      return runMockQuery(text, params || []);
    }
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('[WARNING] Database query failed. Falling back to Local Mock JSON DB.', err);
      useLocalMockDB = true;
      return runMockQuery(text, params || []);
    }
  }
};
