import express from 'express';
import Product from '../models/product.js';

const router = express.Router();

// Get all active products
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = { is_active: true };
    
    if (category) {
      filter.category = category;
    }

    const products = await Product.find(filter)
      .sort({ sort_order: 1, name: 1 })
      .lean();

    res.json({ ok: true, products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get products' });
  }
});

// Admin: Get all products (including inactive)
router.get('/admin', async (req, res) => {
  try {
    const { page = 1, pageSize = 25, category, is_active } = req.query;
    const skip = (page - 1) * pageSize;

    const filter = {};
    if (category) filter.category = category;
    if (is_active !== undefined) filter.is_active = is_active === 'true';

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ sort_order: 1, name: 1 })
        .skip(skip)
        .limit(Number(pageSize))
        .lean(),
      Product.countDocuments(filter)
    ]);

    res.json({
      ok: true,
      products,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get admin products error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get products' });
  }
});

// Admin: Create new product
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      currency,
      available_quantity,
      max_quantity_per_order,
      image_url,
      specifications,
      instructions,
      requires_advance_notice_hours,
      admin_notes,
      sort_order
    } = req.body;

    if (!name || !price) {
      return res.status(400).json({ ok: false, error: 'Name and price are required' });
    }

    const product = new Product({
      name,
      description,
      category,
      price: Number(price),
      currency: currency || 'USD',
      available_quantity: Number(available_quantity) || 1,
      max_quantity_per_order: Number(max_quantity_per_order) || 1,
      image_url,
      specifications,
      instructions,
      requires_advance_notice_hours: Number(requires_advance_notice_hours) || 24,
      admin_notes,
      sort_order: Number(sort_order) || 0
    });

    await product.save();

    res.json({ ok: true, product: product.toObject() });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create product' });
  }
});

// Admin: Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert numeric fields
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.available_quantity !== undefined) updateData.available_quantity = Number(updateData.available_quantity);
    if (updateData.max_quantity_per_order !== undefined) updateData.max_quantity_per_order = Number(updateData.max_quantity_per_order);
    if (updateData.requires_advance_notice_hours !== undefined) updateData.requires_advance_notice_hours = Number(updateData.requires_advance_notice_hours);
    if (updateData.sort_order !== undefined) updateData.sort_order = Number(updateData.sort_order);

    const product = await Product.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    res.json({ ok: true, product: product.toObject() });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update product' });
  }
});

// Admin: Delete product
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    res.json({ ok: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete product' });
  }
});

// Get product by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ ok: false, error: 'Product not found' });
    }

    res.json({ ok: true, product: product.toObject() });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get product' });
  }
});

export default router; 