-- Second Migration: Products and Collections Tables Setup

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create products table with expanded heritage fields
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  price DECIMAL(10, 2) NOT NULL,
  old_price DECIMAL(10, 2),
  image_url TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
  video_url TEXT,
  sizes TEXT[] DEFAULT '{"S", "M", "L", "XL", "XXL"}',
  colors TEXT[] DEFAULT '{}',
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  fabric_ar TEXT,
  fabric_en TEXT,
  design_story_ar TEXT,
  design_story_en TEXT,
  embroidery_ar TEXT,
  embroidery_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_collection ON products(collection_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);

-- Alter table orders to link to products optional relation
ALTER TABLE orders ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id) ON DELETE SET NULL;

-- Alter table products to add rich heritage fields if they do not exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS fabric_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS fabric_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS design_story_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS design_story_en TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS embroidery_ar TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS embroidery_en TEXT;

-- Seed collections if empty
INSERT INTO collections (slug, name_ar, name_en, description_ar, description_en, image_url)
SELECT 'algerian-caftans', 'القفطان الجزائري الفاخر', 'Luxury Algerian Caftans', 'مجموعة القفطان الجزائري الفاخر - قفاطين راقية للمناسبات والأعراس تعكس أصالة التراث الجزائري العريق بتطريزات ذهبية فريدة', 'Luxury Algerian Caftans Collection - Premium caftans for weddings and special occasions reflecting the heritage of Algerian craftsmanship with golden embroidery.', '/images/collection_caftans.png'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'algerian-caftans');

INSERT INTO collections (slug, name_ar, name_en, description_ar, description_en, image_url)
SELECT 'algerian-karakou', 'الكاراكو العاصمي التقليدي', 'Traditional Algerian Karakou', 'مجموعة الكاراكو العاصمي - أناقة عاصمية خالدة تجمع بين سترة المخمل المطرزة بالفتلة والبنطلون الحريري لإطلالة متميزة', 'Traditional Algerian Karakou Collection - Timeless Algiers elegance combining embroidered velvet jackets with silk pants/skirts for a royal look.', '/images/collection_karakou.png'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'algerian-karakou');

INSERT INTO collections (slug, name_ar, name_en, description_ar, description_en, image_url)
SELECT 'bridal-special', 'مجموعة العرائس والأفراح', 'Bridal & Wedding Special', 'مجموعة العرائس والأفراح - قفاطين وكاراكو مصممة خصيصاً للعروس لتتألق في ليلة العمر بأفخم التطريزات وأرقى الأقمشة', 'Bridal & Wedding Special Collection - Exquisite caftans and karakous custom-tailored for brides to shine on their special day.', '/images/collection_bridal.png'
WHERE NOT EXISTS (SELECT 1 FROM collections WHERE slug = 'bridal-special');

-- Seed products if empty (10 Diverse Algerian Costumes)

-- 1. Emerald Royal Caftan
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'emerald-royal-caftan', 
  'القفطان الملكي الأخضر', 
  'Emerald Royal Caftan', 
  'قفطان ملكي جزائري فاخر من قطيفة الجينز الأصلية، مطرز يدوياً بالخيط الذهبي الفاخر ومزين بالأحجار الكريمة اللامعة. يأتي مع حزام ذهبي منسق لإطلالة أنيقة في الأعراس والمناسبات السعيدة.', 
  'A luxurious royal Algerian Caftan made of authentic velvet, hand-embroidered with premium gold thread and decorated with sparkling gems. Comes with a matching gold belt for an elegant look at weddings.', 
  48000.00, 
  75000.00, 
  '/images/emerald_caftan.png', 
  '{"/images/emerald_caftan.png"}', 
  (SELECT id FROM collections WHERE slug = 'algerian-caftans'), 
  '{"S", "M", "L", "XL", "XXL"}', 
  '{"Emerald Green", "Gold"}', 
  TRUE,
  'قطيفة الجينز الفاخرة (Velvet) المستوردة خصيصاً، مع بطانة داخلية ناعمة من الحرير الساتاني لراحة تامة.',
  'Premium heavy velvet fabric, lined with soft satin silk for maximum comfort and structure.',
  'يجسد هذا التصميم الهيبة والملكية. تم تصميمه للعروس التي تبحث عن إطلالة تجمع بين فخامة التراث العريق وسحر ليلة العمر، لتكون نجمة متلألئة بين الحضور.',
  'Inspired by the royal Algerian courts, this caftan evokes majesty and pride, custom tailored for brides wanting to represent absolute heritage on their wedding night.',
  'تطريز يدوي بالفتلة والمجبود الذهبي المتقن، بنقوش جزائرية كلاسيكية مع تركيب يدوي للخرز اللامع والعقاد.',
  'Hand-embroidered using traditional gold Fetla and Majboud techniques with sparkling crystal beads and hand-braided Aakad buttons.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'emerald-royal-caftan');

-- 2. Royal Blue Karakou
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'royal-blue-karakou', 
  'كاراكو عاصمي أزرق ملكي', 
  'Algiers Royal Blue Karakou', 
  'كاراكو عاصمي جزائري يجمع بين الحداثة والأصالة. سترة من المخمل الفاخر مطرزة يدوياً بالفتلة العاصمية الكلاسيكية، مع سروال الشلقة من الحرير الطبيعي الانسيابي.', 
  'A traditional Algerian Karakou combining modernity and heritage. High-quality velvet jacket hand-embroidered with classic Algiers Fetla, paired with flowing natural silk Chelka trousers.', 
  65000.00, 
  95000.00, 
  '/images/royal_blue_karakou.png', 
  '{"/images/royal_blue_karakou.png"}', 
  (SELECT id FROM collections WHERE slug = 'algerian-karakou'), 
  '{"S", "M", "L", "XL"}', 
  '{"Royal Blue", "White"}', 
  TRUE,
  'سترة من القطيفة الفاخرة باللون الأزرق الملكي، مقترنة مع سروال الشلقة من حرير الكريب الطبيعي الانسيابي.',
  'Royal blue velvet jacket combined with high-grade flowing natural silk crepe for the Chelka trousers.',
  'كاراكو الجزائر العاصمة هو فخر الهوية. يروي هذا الموديل قصة الأناقة العاصمية التي تتناقلها العائلات كإرث خالد للمناسبات الفخمة والأفراح.',
  'A celebration of Algiers high fashion. This Karakou represents the timeless urban elegance of the Algerian capital, traditionally worn by noblewomen.',
  'تطريز "الفتلة" اليدوي بخيوط ذهبية خالصة تحاكي طيور الجنة وأزهار الياسمين الدمشقية التقليدية.',
  'Intricate hand-made Fetla embroidery depicting jasmine patterns and traditional symbols of beauty using metallic gold threads.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'royal-blue-karakou');

-- 3. White Bridal Karakou
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'white-bridal-karakou', 
  'كاراكو العروس الأبيض المذهب', 
  'White Bridal Majesty Karakou', 
  'كاراكو العروس الأبيض الفخم، مصمم خصيصاً لليلة الزفاف والخطوبة. سترة مخملية بيضاء ناصعة مطرزة بالخيوط الذهبية والخرز اللامع مع سروال مدور من الحرير الفاخر.', 
  'A luxurious white bridal Karakou, custom-designed for wedding and engagement nights. Bright white velvet jacket embroidered with gold thread and shiny beads, paired with a rounded skirt made of premium silk.', 
  85000.00, 
  120000.00, 
  '/images/white_bridal_karakou.png', 
  '{"/images/white_bridal_karakou.png"}', 
  (SELECT id FROM collections WHERE slug = 'bridal-special'), 
  '{"S", "M", "L"}', 
  '{"Bridal White", "Gold"}', 
  TRUE,
  'سترة مخملية بيضاء ناصعة، وسروال مدور فسيح من الحرير الطبيعي الإيطالي الثقيل.',
  'Pure white premium velvet jacket combined with Italian heavy silk for the traditional rounded trousers (Seroual Mdouer).',
  'صمم هذا الكاراكو ليكون جوهرة ليلة العمر. البياض الناصع مع بريق الخيوط الذهبية يعكس نقاء وفخامة العروس الجزائرية في أسعد ليالي حياتها.',
  'Crafted specifically as a masterwork for brides, combining pure bridal white and brilliant gold to represent purity and prestige in Algerian marriage traditions.',
  'تطريز كثيف وثقيل بالفتلة والمجبود والخرز الكريستالي اللامع، تم تنفيذه يدوياً بحرفية استغرقت أكثر من 60 ساعة من العمل.',
  'Heavy, dense hand-embroidery using gold thread, pearls, and crystals, requiring over 60 hours of dedicated manual craftsmanship.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'white-bridal-karakou');

-- 4. Burgundy Velvet Caftan
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'burgundy-velvet-caftan', 
  'القفطان المخملي الخمري', 
  'Burgundy Velvet Caftan', 
  'قفطان جزائري مذهل بلون خمري دافئ وجذاب. مصنوع من المخمل الفاخر ومطرز بالخيوط الذهبية بتفاصيل دقيقة تنساب على الأطراف والأكمام، مثالي للسهرات والمناسبات العائلية الراقية.', 
  'A stunning Algerian Caftan in a warm and attractive burgundy color. Crafted from luxury velvet and embroidered with gold threads in meticulous details along the edges and sleeves, perfect for evening gatherings.', 
  42000.00, 
  68000.00, 
  '/images/burgundy_caftan.png', 
  '{"/images/burgundy_caftan.png"}', 
  (SELECT id FROM collections WHERE slug = 'algerian-caftans'), 
  '{"S", "M", "L", "XL", "XXL"}', 
  '{"Burgundy", "Gold"}', 
  FALSE,
  'قطيفة فرنسية فاخرة وناعمة الملمس ذات لمعان جذاب باللون الخمري المتميز.',
  'Premium French velvet with a deep burgundy shade and soft texture that reflects light elegantly.',
  'يعبر اللون الخمري عن الدفء والوقار. تم تصميم هذا القفطان ليمزج بين هيبة التراث التاريخي والنعومة العصرية، ليكون الخيار الأفضل لسهراتكِ السعيدة.',
  'Designed for evening warmth, this caftan blends historical prestige with modern modesty, perfect for family ceremonies and elegant gatherings.',
  'تطريز ذهبي دقيق وناعم على الصدر والأكمام مع أحزمة المحزمة التقليدية وعقاد منسقة يدوياً بالكامل.',
  'Delicate gold thread embroidery on collar, sleeves, and chest, finished with hand-crafted buttons (Aakad) and a matching waist belt.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'burgundy-velvet-caftan');

-- 5. Chedda Tlemcen Majesty
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'chedda-tlemcen-majesty', 
  'الشدة التلمسانية السلطانية', 
  'Tlemcen Royal Bridal Chedda', 
  'الشدة التلمسانية الأسطورية، اللباس الأكثر فخامة وعراقة لعروس غرب الجزائر والمصنف عالمياً لدى اليونسكو. تفاصيل ملكية تشمل القفطان المطرز والسترة المذهبة وتاج الجوهر.', 
  'The legendary Tlemcen Chedda, the most prestigious traditional bridal attire of Western Algeria, registered by UNESCO. Absolute royalty including embroidered caftan, gold vest, and pearl headwear.', 
  95000.00, 
  140000.00, 
  '/images/emerald_caftan.png', -- Fallback image
  '{"/images/emerald_caftan.png"}', 
  (SELECT id FROM collections WHERE slug = 'bridal-special'), 
  '{"S", "M", "L"}', 
  '{"Gold", "Royal Red"}', 
  TRUE,
  'مزيج ملكي من الحرير البروكار المذهب، سترة مخملية ثقيلة (الستة) وأقمشة الدانتيل والساتان الفاخر.',
  'A royal blend of gold brocade silk, heavy velvet jacket, traditional laces, and finest under-linings.',
  'الشدة التلمسانية ليست مجرد فستان بل هي إرث حضاري مصنف كإرث إنساني. تعود أصولها لملوك تلمسان، وتمنح العروس طلّة سلطانية تجعلها ملكة متوجة بحق.',
  'Classified by UNESCO, Tlemcen Chedda is a cultural treasure dating back to the royal dynasties of Tlemcen, creating an unforgettable queenly presence for the bride.',
  'تطريز كثيف بالفتلة والمجبود والكنتير الذهبي الأصيل، مع حبات الجوهر الحقيقية المصنفة يدوياً حبة حبة.',
  'Heavy traditional embroidery using authentic gold Majboud, Kentir, and real pearls stitched onto the fabrics manually.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'chedda-tlemcen-majesty');

-- 6. Algiers Badroune Elegance
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'algiers-badroune-elegance', 
  'البدرون العاصمي الحريري', 
  'Algiers Badroune Silk Elegance', 
  'البدرون العاصمي المتميز بقصته الانسيابية التي تبرز رشاقة المرأة وجاذبيتها. سترة متصلة مطرزة بالفتلة الرقيقة تتدفق إلى الأسفل بنعومة الحرير الراقي.', 
  'The Algiers Badroune featuring a sleek, flowing design that enhances feminine grace. Styled with delicate gold Fetla embroidery flowing into smooth silk trousers.', 
  38000.00, 
  55000.00, 
  '/images/royal_blue_karakou.png', 
  '{"/images/royal_blue_karakou.png"}', 
  (SELECT id FROM collections WHERE slug = 'algerian-karakou'), 
  '{"S", "M", "L", "XL"}', 
  '{"White", "Creamy Ivory"}', 
  FALSE,
  'حرير كريب طبيعي ناعم ومريح مقترن بلمسات مخملية خفيفة على الياقة والكتف.',
  'Natural silk crepe and flowing satin, with subtle velvet details along the shoulders and borders.',
  'ابتكر البدرون ليكون عنواناً للحداثة الممزوجة بأصالة قصبة الجزائر. إنه اللباس المفضّل للعروس للاستقبال أو السهرة بفضل قصته المريحة والأنيقة.',
  'Created as a bridge between tradition and modernity. Algiers Badroune is highly favored by modern brides for its lightweight, elegant silhouette.',
  'تطريز "الفتلة" الذهبي الرقيق على الصدر والأكمام مع لمسة ناعمة من العقاد التقليدية.',
  'Delicate gold Fetla threads hand-guided on the collar and chest area with traditional hand-wrapped buttons.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'algiers-badroune-elegance');

-- 7. Chaoui Djebba of Aurès
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'chaoui-djebba-aures', 
  'الجبة الشاوية الأوراسية', 
  'Chaoui Djebba of Aurès', 
  'الجبة الشاوية الفخمة التي ترمز لشموخ جبال الأوراس وعزة المرأة الأوراسية الحرة. تتميز بالألوان الحيوية والرموز الأمازيغية العريقة وتصميم مريح وأنيق.', 
  'The magnificent Chaoui Djebba representing the pride of the Aurès mountains. Characterized by vibrant colors, ancestral Amazigh symbols, and a majestic fit.', 
  32000.00, 
  48000.00, 
  '/images/burgundy_caftan.png', 
  '{"/images/burgundy_caftan.png"}', 
  (SELECT id FROM collections WHERE slug = 'algerian-caftans'), 
  '{"S", "M", "L", "XL", "XXL"}', 
  '{"Midnight Black", "Royal Red"}', 
  FALSE,
  'قطيفة خفيفة وناعمة (Velvet) مقترنة بأشرطة ملونة منسوجة يدوياً.',
  'Soft lightweight velvet paired with colorful hand-woven Berber ribbons.',
  'تحمل الجبة الشاوية تاريخ ثورة الأوراس وشموخ جبالها. الألوان والتطريز يرمزان للفرح والحياة الأمازيغية الحرة، وهي تعبير عن القوة والجمال الأصيل.',
  'Representing the historic mountains of Aurès. Its vibrant borders symbolize joy, nature, and the free-spirited Amazigh lifestyle.',
  'تطريز كثيف بالخيوط الحريرية اللامعة ورسومات الحلي البربرية الفضية التقليدية (الخلالة) والخرز.',
  'Vibrant thread embroidery (Sorsar) copying traditional Berber jewelry motifs and protective silver symbols.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'chaoui-djebba-aures');

-- 8. Constantine Djebba Fergani
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'constantine-fergani-velvet', 
  'الجبة القسنطينية الفرقاني', 
  'Constantine Djebba Fergani', 
  'الجبة القسنطينية الأصلية (الفرقاني)، اللباس الأكثر فخامة في الشرق الجزائري. مخمل ملكي ثقيل مطرز بالكامل بخيوط المجبود الذهبية بنقوش الطاووس والأزهار الأسطورية.', 
  'The authentic Constantine Djebba (Fergani), the peak of eastern Algerian luxury. Heavy royal velvet fully embroidered with golden Majboud depicting peacock and floral patterns.', 
  88000.00, 
  130000.00, 
  '/images/burgundy_caftan.png', 
  '{"/images/burgundy_caftan.png"}', 
  (SELECT id FROM collections WHERE slug = 'bridal-special'), 
  '{"S", "M", "L", "XL"}', 
  '{"Imperial Burgundy", "Emerald Green"}', 
  TRUE,
  'قطيفة جنوة الأصلية الثقيلة المستوردة خصيصاً لتحمل التطريز الذهبي الكثيف والخرز الكريستالي.',
  'Heavy authentic Genoa velvet, specifically selected to support the dense gold embroidery and crystal weights.',
  'الفرقاني هو قطعة إرث تاريخية تتناقلها الأمهات للفتيات ككنز عائلي. يرمز إلى الوقار والجاه، وتألقكِ به يجعلكِ ترتدين قطعة من عمق التاريخ الجزائري.',
  'A heirloom masterpiece passed down from mother to daughter. The Fergani represents dignity, status, and centuries of Constantine art and royalty.',
  'تطريز يدوي مكثف بالذهب الخالص (المجبود والفتلة)، يغطي الصدر والكتف والأطراف بنقوش الطاووس والورود التاريخية.',
  'Dense, manual gold thread embroidery (Majboud) covering the front, chest, and borders with classic peacock and rose motifs.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'constantine-fergani-velvet');

-- 9. Kabyle Traditional Dress
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'kabyle-traditional-dress', 
  'الجبة القبائلية الأمازيغية', 
  'Traditional Kabyle Djeba', 
  'الجبة القبائلية بألوانها الزاهية المشرقة التي ترمز لجمال طبيعة بلاد القبائل وجبال جرجرة. تأتي مع الحزام الحريري التقليدي والشرائط المنسوجة باليد.', 
  'The traditional Kabyle Djeba with bright, cheerful colors representing the nature of Kabylie. Includes the classic woven silk belt and colorful hand-guided patterns.', 
  28000.00, 
  42000.00, 
  '/images/white_bridal_karakou.png', 
  '{"/images/white_bridal_karakou.png"}', 
  (SELECT id FROM collections WHERE slug = 'algerian-caftans'), 
  '{"S", "M", "L", "XL", "XXL"}', 
  '{"Bridal White", "Bright Yellow"}', 
  FALSE,
  'قطن طبيعي خفيف وصحي مقترن بالحرير والشرائط الملونة لراحة تامة.',
  'Premium lightweight cotton, mixed with silk ribbons and traditional colorful braids.',
  'تروي الجبة القبائلية قصة ارتباط الأمازيغ بأرضهم وهويتهم العريقة. تعبر ألوان الأشرطة (الأصفر والأخضر والأحمر) عن الشمس والطبيعة والثورة والأمل.',
  'Every ribbon on the Kabyle dress tells a story of identity and attachment to the Amazigh land. Colors reflect the sun, fertility, and hope.',
  'تطريز يدوي ناعم ومتقاطع مع دمج شرائط الدانتيل والأشرطة الملونة الزاهية (الزيغزاغ) على الصدر والأطراف.',
  'Detailed geometric patterns created using traditional colorful zigzag ribbons and fine hand-woven braids.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'kabyle-traditional-dress');

-- 10. Naili Princess Dress
INSERT INTO products (slug, name_ar, name_en, description_ar, description_en, price, old_price, image_url, images, collection_id, sizes, colors, is_featured, fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en)
SELECT 
  'naili-princess-dress', 
  'الفستان النايلي الأصيل', 
  'Naili Princess Steppe Dress', 
  'الفستان النايلي التقليدي المتميز بنقائه ولونه الأبيض الناصع المنساب. يرمز للشهامة والوقار والجمال الصحراوي الراقي لمنطقة أولاد نايل بالهضاب العليا.', 
  'The traditional Naili attire, distinguished by its purity and flowing white layers. Symbolizing dignity, chivalry, and desert beauty of the highlands.', 
  35000.00, 
  52000.00, 
  '/images/white_bridal_karakou.png', 
  '{"/images/white_bridal_karakou.png"}', 
  (SELECT id FROM collections WHERE slug = 'bridal-special'), 
  '{"S", "M", "L", "XL"}', 
  '{"Pure White", "Cream"}', 
  FALSE,
  'شيفون فرنسي شفاف وناعم مع بطانة من الحرير الناعم لراحة فائقة وانسيابية في الحركة.',
  'French chiffon and soft silk lining, layered to create fluid movement and steppe elegance.',
  'يعبر اللباس النايلي عن كرم وشهامة قبائل أولاد نايل. يتمايل الفستان برقة ونعومة مع كل خطوة للعروس ليمنحها طلّة هادئة وراقية تخطف الأنفاس.',
  'Reflecting the nobility and hospitality of the Naili tribe. The dress sways gently with every step, creating a serene, breathable, and royal presence.',
  'تطريز بالخيوط الفضية أو الذهبية الرقيقة والخرز المضيء وشرائط الدانتيل البيضاء المنسقة باليد.',
  'Fine silver or gold thread embroidery paired with white lace details, carefully hand-guided on the layers.'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE slug = 'naili-princess-dress');
