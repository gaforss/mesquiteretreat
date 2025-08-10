import mongoose from 'mongoose';
import Product from '../models/product.js';
import 'dotenv/config';

const sampleProducts = [
  {
    name: "Golf Club Set",
    description: "Complete set of golf clubs including driver, irons, putter, and golf bag. Perfect for a day on the course.",
    category: "golf",
    price: 45,
    available_quantity: 2,
    max_quantity_per_order: 1,
    instructions: "Clubs are stored in the garage. Please return clean and dry.",
    requires_advance_notice_hours: 24,
    sort_order: 1
  },
  {
    name: "Beach Umbrella & Chairs",
    description: "Large beach umbrella with 2 comfortable beach chairs. Great for poolside or beach days.",
    category: "beach",
    price: 25,
    available_quantity: 1,
    max_quantity_per_order: 1,
    instructions: "Located in the storage closet. Please return clean and dry.",
    requires_advance_notice_hours: 12,
    sort_order: 2
  },
  {
    name: "Beach Towels (Set of 4)",
    description: "Premium beach towels, perfect for pool or beach use. Soft and absorbent.",
    category: "beach",
    price: 15,
    available_quantity: 3,
    max_quantity_per_order: 2,
    instructions: "Towels are in the linen closet. Please return clean.",
    requires_advance_notice_hours: 6,
    sort_order: 3
  },
  {
    name: "Portable Bluetooth Speaker",
    description: "Waterproof portable speaker with great sound quality. Perfect for poolside music.",
    category: "entertainment",
    price: 20,
    available_quantity: 1,
    max_quantity_per_order: 1,
    instructions: "Speaker is in the living room cabinet. Please return charged.",
    requires_advance_notice_hours: 6,
    sort_order: 4
  },
  {
    name: "Board Games Collection",
    description: "Selection of popular board games including Monopoly, Scrabble, and Cards Against Humanity.",
    category: "entertainment",
    price: 10,
    available_quantity: 1,
    max_quantity_per_order: 1,
    instructions: "Games are in the entertainment center. Please return complete with all pieces.",
    requires_advance_notice_hours: 6,
    sort_order: 5
  },
  {
    name: "Coffee Maker & Supplies",
    description: "Premium coffee maker with coffee beans, filters, and travel mugs for your morning brew.",
    category: "kitchen",
    price: 15,
    available_quantity: 1,
    max_quantity_per_order: 1,
    instructions: "Coffee setup is in the kitchen. Please clean after use.",
    requires_advance_notice_hours: 12,
    sort_order: 6
  },
  {
    name: "BBQ Grill & Tools",
    description: "Portable BBQ grill with all necessary tools and cleaning supplies.",
    category: "outdoor",
    price: 30,
    available_quantity: 1,
    max_quantity_per_order: 1,
    instructions: "Grill is in the backyard. Please clean thoroughly after use.",
    requires_advance_notice_hours: 24,
    sort_order: 7
  },
  {
    name: "Hiking Backpack & Supplies",
    description: "Comfortable hiking backpack with water bottles, first aid kit, and trail snacks.",
    category: "outdoor",
    price: 25,
    available_quantity: 1,
    max_quantity_per_order: 1,
    instructions: "Backpack is in the garage. Please return clean and restocked.",
    requires_advance_notice_hours: 24,
    sort_order: 8
  }
];

async function createSampleProducts() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mesquiteretreat';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Create sample products
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Created ${createdProducts.length} sample products:`);

    createdProducts.forEach(product => {
      console.log(`- ${product.name}: $${product.price} (${product.category})`);
    });

    console.log('\nSample products created successfully!');
    process.exit(0);

  } catch (error) {
    console.error('Error creating sample products:', error);
    process.exit(1);
  }
}

createSampleProducts(); 