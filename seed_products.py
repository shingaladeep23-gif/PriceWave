import sqlite3

PRODUCTS = [
    # ELECTRONICS (15)
    ("Samsung 260L Double Door Refrigerator", "Energy-efficient frost-free refrigerator with digital inverter compressor, 5-star rated, toughened glass shelves.", 23990, 21990, 45, "Electronics", "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=300&fit=crop"),
    ("LG 1.5 Ton 5 Star Dual Inverter Split AC", "Dual inverter compressor, 4-way swing, anti-bacterial filter, auto-clean, Wi-Fi enabled smart control.", 35990, 33490, 30, "Electronics", "https://picsum.photos/seed/lg-split-ac/400/300"),
    ("Sony WH-1000XM5 Wireless Headphones", "Industry-leading noise cancellation, 30-hour battery life, multipoint connection, Auto NC Optimizer.", 29990, 26990, 80, "Electronics", "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop"),
    ("Realme Narzo 60 Pro 5G 128GB", "MediaTek Dimensity 6080 5G, 67W SUPERVOOC charging, 5000mAh battery, 64MP OIS triple camera.", 19999, 18999, 120, "Electronics", "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=300&fit=crop"),
    ("Samsung Galaxy S23 FE 128GB", "Snapdragon 8 Gen 1, 50MP triple camera, 4500mAh battery, 25W fast charging, IP68 water resistant.", 49999, 44999, 60, "Electronics", "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=400&h=300&fit=crop"),
    ("Mi 43 Inch 4K Ultra HD Smart Android TV", "Vivid 4K UHD display, PatchWall UI, 20W Dolby Audio, built-in Chromecast and Google Assistant.", 29999, 27999, 55, "Electronics", "https://images.unsplash.com/photo-1593359677879-a4bb92f4333b?w=400&h=300&fit=crop"),
    ("Lenovo IdeaPad Slim 3 15.6 Inch Laptop", "Intel Core i5 12th Gen, 8GB RAM, 512GB SSD, Full HD IPS display, TUV Rheinland eye-care certified.", 49990, 46990, 40, "Electronics", "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop"),
    ("Canon EOS 1500D 24.1MP DSLR Camera", "24.1MP CMOS sensor, DIGIC 4+ processor, 9-point AF system, Full HD 1080p video, built-in Wi-Fi.", 42990, 39999, 25, "Electronics", "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=300&fit=crop"),
    ("Apple iPad 10th Gen Wi-Fi 64GB", "A14 Bionic chip, 10.9-inch Liquid Retina display, 12MP front Ultra Wide camera, USB-C connector.", 44900, 44900, 35, "Electronics", "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=300&fit=crop"),
    ("JBL Flip 6 Portable Bluetooth Speaker", "Powerful JBL Original Pro Sound, IP67 waterproof and dustproof, 12 hours playtime, PartyBoost.", 9999, 8999, 100, "Electronics", "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400&h=300&fit=crop"),
    ("Fire-Boltt Phoenix Ultra Smartwatch", "1.43-inch AMOLED display, Bluetooth calling, SpO2 and heart rate monitoring, 100+ sports modes.", 2999, 2499, 200, "Electronics", "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop"),
    ("boAt Rockerz 450 Bluetooth Headphone", "40mm dynamic drivers, 15 hours playback, soft padded ear cushions, foldable design, voice assistant.", 1999, 1499, 150, "Electronics", "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=400&h=300&fit=crop"),
    ("Dell Inspiron 15 Core i5 11th Gen Laptop", "Intel Core i5 11th Gen, 8GB RAM, 512GB SSD, 15.6-inch FHD Anti-glare display, backlit keyboard.", 57990, 52990, 30, "Electronics", "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=300&fit=crop"),
    ("Apple iPhone 14 128GB Midnight", "A15 Bionic chip, 12MP dual camera, Emergency SOS via satellite, Crash Detection, 5G capable.", 72900, 69900, 50, "Electronics", "https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=400&h=300&fit=crop"),
    ("HP DeskJet 2331 All-in-One Printer", "Print, scan and copy, USB connectivity, 7.5 ppm black print speed, compact design for home.", 4999, 3999, 60, "Electronics", "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&h=300&fit=crop"),

    # CLOTHING (10)
    ("Mens Regular Fit Cotton Casual Shirt", "100% pure cotton breathable fabric, regular fit, button-down collar, available in 12 colours.", 799, 699, 300, "Clothing", "https://images.unsplash.com/photo-1620012253295-c15cc3e65df4?w=400&h=300&fit=crop"),
    ("Womens Floral Anarkali Kurta", "Beautiful floral print anarkali kurta with intricate embroidery, pure cotton, ethnic Indian elegance.", 1199, 999, 200, "Clothing", "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?w=400&h=300&fit=crop"),
    ("Levis Mens 511 Slim Fit Jeans", "Premium denim, slim through seat and thighs with straight leg opening, 5-pocket styling, stretch.", 2999, 2499, 180, "Clothing", "https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=300&fit=crop"),
    ("Womens Hooded Trench Coat", "Water-resistant trench coat with removable hood, self-tie belt, oversized pockets, autumn essential.", 3999, 3499, 80, "Clothing", "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&h=300&fit=crop"),
    ("Mens Cotton Polo Neck T-Shirt", "Pique fabric polo t-shirt with two-button placket, ribbed collar and cuffs, machine washable.", 599, 499, 400, "Clothing", "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=300&fit=crop"),
    ("Womens Chiffon Maxi Summer Dress", "Lightweight chiffon maxi dress with floral print, spaghetti straps, flowy silhouette for summer.", 1299, 999, 150, "Clothing", "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=400&h=300&fit=crop"),
    ("Van Heusen Mens Slim Fit Formal Trousers", "Wrinkle-resistant fabric, slim fit, inner elastic waistband, 4-pocket design for office wear.", 1599, 1299, 120, "Clothing", "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=400&h=300&fit=crop"),
    ("Womens Handwoven Banarasi Silk Saree", "Handwoven Banarasi silk with zari work borders, unstitched blouse piece included, festive wear.", 2999, 2199, 60, "Clothing", "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=300&fit=crop"),
    ("Mens Woolen Pullover Sweater", "Soft merino wool blend pullover with ribbed cuffs and hem, regular fit, ideal for cold winters.", 1799, 1499, 100, "Clothing", "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=300&fit=crop"),
    ("Girls Printed Cotton Kurta Palazzo Set", "Pure cotton kurta with matching palazzo pants, ethnic prints, comfortable daily ethnic wear.", 999, 799, 180, "Clothing", "https://images.unsplash.com/photo-1503944583220-791a2e3b59b8?w=400&h=300&fit=crop"),

    # HOME & GARDEN (10)
    ("Prestige 5-Piece Non-Stick Cookware Set", "Hard anodised non-stick coating with Bakelite handles, induction-compatible, PFOA-free surface.", 2999, 2499, 80, "Home & Garden", "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=300&fit=crop"),
    ("Philips AC1215 Air Purifier 57 sqm", "True HEPA filter removes 99.97% particles, VitaShield IPS technology, CADR 333m3/h, quiet mode.", 11990, 9999, 40, "Home & Garden", "https://picsum.photos/seed/air-purifier-home/400/300"),
    ("Orient Electric Aeroslim Pedestal Fan 400mm", "BLDC motor, IoT-enabled smart fan, 5 speed settings, 35% energy saving, remote control included.", 4499, 3499, 70, "Home & Garden", "https://picsum.photos/seed/electric-fan/400/300"),
    ("Pigeon Stovekraft Induction Cooktop 2000W", "Auto voltage regulator, 7 preset menus, feather touch controls, crystal glass top, 2-year warranty.", 2199, 1799, 90, "Home & Garden", "https://picsum.photos/seed/induction-cooker/400/300"),
    ("Havells Lumeno 8W LED Table Lamp", "Eye-care technology, 3-level dimmer, USB charging port, 360-degree rotating head, 4000K white.", 1199, 899, 150, "Home & Garden", "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop"),
    ("Milton Thermosteel Flask 1 Litre", "Double-wall stainless steel vacuum insulated, keeps hot 24 hrs and cold 48 hrs, leak-proof lid.", 799, 599, 250, "Home & Garden", "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop"),
    ("IFB 25L Solo Microwave Oven", "Child lock, 51 auto-cook menus, steam clean, deodorize feature, stainless steel cavity.", 10990, 8999, 45, "Home & Garden", "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=400&h=300&fit=crop"),
    ("Cello Opalware Dinner Set 35 Pieces", "Break-resistant opalware, dishwasher safe, microwave safe, scratch-resistant glaze, elegant design.", 1999, 1499, 100, "Home & Garden", "https://images.unsplash.com/photo-1490818387583-1baba5e638af?w=400&h=300&fit=crop"),
    ("Usha Dream Stitch Electric Sewing Machine", "23 stitch patterns, auto needle threader, drop feed for free motion, built-in light, foot pedal.", 9499, 7999, 30, "Home & Garden", "https://picsum.photos/seed/sewing-machine/400/300"),
    ("Borosil Glass Mixing Bowl Set of 3", "Borosilicate glass, microwave and oven safe to 300C, dishwasher safe, airtight snap-lock lids.", 999, 799, 120, "Home & Garden", "https://images.unsplash.com/photo-1585515320310-259814833e62?w=400&h=300&fit=crop"),

    # BEAUTY (5)
    ("Lakme 9 to 5 Weightless Mousse Foundation", "Buildable blendable coverage, SPF 8 protection, 24-hour wear, available in 9 Indian skin shades.", 499, 399, 200, "Beauty", "https://images.unsplash.com/photo-1586495777744-4e6232bf2223?w=400&h=300&fit=crop"),
    ("Himalaya Purifying Neem Face Wash 150ml", "Neem and turmeric extracts purify skin and prevent pimples, gentle pH-balanced daily formula.", 249, 199, 500, "Beauty", "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=300&fit=crop"),
    ("Mamaearth Vitamin C Face Serum 30ml", "2% vitamin C with niacinamide and kojic acid for brightening, even skin tone and dark spot reduction.", 699, 599, 180, "Beauty", "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=400&h=300&fit=crop"),
    ("LOreal Paris Total Repair 5 Shampoo 400ml", "5-action repair formula restores strength, smoothness and shine to weak, damaged hair.", 449, 349, 300, "Beauty", "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=400&h=300&fit=crop"),
    ("Nivea Men Dark Spot Reduction Face Wash", "Active charcoal removes 10x more dark spots, oil control formula, acne-care daily face wash.", 229, 179, 400, "Beauty", "https://picsum.photos/seed/mens-facewash/400/300"),

    # SPORTS (8)
    ("Adidas Duramo SL Running Shoes Men", "Lightweight breathable mesh upper, Cloudfoam cushioned midsole, Adiwear outsole, 5 colour options.", 4999, 3999, 150, "Sports", "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop"),
    ("SS Master Kashmir Willow Cricket Bat", "Kashmir willow blade, round-shaped cane handle, ideal for leather ball cricket, full size SH.", 1799, 1499, 80, "Sports", "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=300&fit=crop"),
    ("Nivia Storm Football Size 5", "Machine-stitched PU outer casing, nylon wound, natural latex bladder, FIFA-inspected quality.", 799, 599, 200, "Sports", "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=400&h=300&fit=crop"),
    ("Cosco CB-85 Badminton Racket Set of 2", "Aluminium frame, full-cover carry bag, 3 nylon shuttlecocks included, ideal for beginners.", 1199, 899, 120, "Sports", "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&h=300&fit=crop"),
    ("Boldfit Heavy Duty Gym Bag 45L", "Water-resistant polyester, separate shoe compartment, padded shoulder strap, 6 pockets.", 999, 799, 160, "Sports", "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=300&fit=crop"),
    ("Boldfit Yoga Mat 6mm Anti-Slip TPE", "Eco-friendly TPE material, double-layer anti-slip design, alignment lines, carry strap included.", 699, 499, 200, "Sports", "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop"),
    ("Puma Wired Run IDP Running Shoes Men", "Lightweight mesh upper, SoftFoam+ sockliner cushioning, rubber outsole for multi-surface grip.", 5999, 4499, 100, "Sports", "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&h=300&fit=crop"),
    ("Prokyde Swimming Goggles Anti-Fog UV", "Anti-fog UV-protective polycarbonate lenses, adjustable silicone strap, wide-angle vision.", 599, 449, 180, "Sports", "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=400&h=300&fit=crop"),

    # BOOKS (6)
    ("Atomic Habits by James Clear", "Proven framework for getting 1% better every day. Over 10 million copies sold worldwide.", 499, 399, 300, "Books", "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop"),
    ("The Psychology of Money by Morgan Housel", "19 short stories exploring how people think about money, wealth and making financial decisions.", 449, 349, 250, "Books", "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=300&fit=crop"),
    ("Rich Dad Poor Dad by Robert Kiyosaki", "Worlds bestselling personal finance book, challenges conventional beliefs about money and investing.", 399, 299, 280, "Books", "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=300&fit=crop"),
    ("Wings of Fire by APJ Abdul Kalam", "Autobiography of Indias beloved scientist and 11th President, an inspiring story of perseverance.", 299, 249, 350, "Books", "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop"),
    ("The Alchemist by Paulo Coelho", "A timeless fable about following your dream and listening to your heart, sold in 80 languages.", 399, 299, 400, "Books", "https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?w=400&h=300&fit=crop"),
    ("The Intelligent Investor by Benjamin Graham", "The definitive book on value investing, recommended by Warren Buffett as the best book on investing.", 599, 499, 200, "Books", "https://images.unsplash.com/photo-1554244933-d876deb6b2ff?w=400&h=300&fit=crop"),

    # TOYS (6)
    ("LEGO Classic Creative Bricks 484 Pieces", "484 pieces in 29 colours with storage box, encourages creativity and STEM learning for kids 4+.", 3999, 2999, 60, "Toys", "https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=400&h=300&fit=crop"),
    ("Hot Wheels 5-Car Gift Pack Assorted", "5 die-cast 1:64 scale cars with detailed designs and rolling wheels, ideal for collectors aged 3+.", 799, 599, 200, "Toys", "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop"),
    ("Funskool Scrabble Original Board Game", "Classic word game for 2-4 players, 100 letter tiles, rotating board, English edition, age 10+.", 999, 699, 80, "Toys", "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=400&h=300&fit=crop"),
    ("Hasbro Monopoly Classic Board Game", "The original property trading game for 2-6 players with tokens, money, cards and full gameboard.", 1299, 999, 70, "Toys", "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=400&h=300&fit=crop"),
    ("Mattel Hot Wheels Radio Control Car", "Full-function radio control, 1:28 scale, rechargeable battery and USB charger included.", 1499, 1199, 50, "Toys", "https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=400&h=300&fit=crop"),
    ("Meccano 25-in-1 Engineering Building Kit", "Build 25 working models with 225 real metal pieces, includes motor, wrench and screwdriver.", 2999, 1999, 40, "Toys", "https://picsum.photos/seed/meccano-kit/400/300"),
]

conn = sqlite3.connect("test.db")
cur = conn.cursor()

cur.execute("DELETE FROM cart_items")
cur.execute("DELETE FROM events")
cur.execute("DELETE FROM products")

for p in PRODUCTS:
    cur.execute(
        "INSERT INTO products (name, description, base_price, current_price, stock, category, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
        p
    )

conn.commit()
print(f"Inserted {len(PRODUCTS)} products")
cur.execute("SELECT id, name, current_price, category FROM products LIMIT 5")
for row in cur.fetchall():
    print(row)
conn.close()
