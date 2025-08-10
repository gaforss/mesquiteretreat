import express from 'express';
import Invoice from '../models/invoice.js';
import Product from '../models/product.js';
import { sendInvoiceEmail, sendPaymentConfirmationEmail, sendAdminInvoiceNotification } from '../services/email.service.js';

const router = express.Router();

// Create a new invoice
router.post('/', async (req, res) => {
  try {
    const { 
      customer_email, 
      customer_name, 
      customer_phone, 
      items, 
      check_in_date, 
      check_out_date, 
      reservation_id,
      utm_source,
      utm_medium,
      utm_campaign
    } = req.body;

    if (!customer_email || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Email and items are required' });
    }

    // Validate items and calculate total
    let total_amount = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product || !product.is_active) {
        return res.status(400).json({ ok: false, error: `Product ${item.name} is not available` });
      }

      if (item.quantity > product.max_quantity_per_order) {
        return res.status(400).json({ ok: false, error: `Maximum quantity for ${product.name} is ${product.max_quantity_per_order}` });
      }

      const itemTotal = product.price * item.quantity;
      total_amount += itemTotal;

      validatedItems.push({
        name: product.name,
        description: product.description,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal
      });
    }

    // Set expiry to 24 hours from now
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invoice = new Invoice({
      customer_email: customer_email.toLowerCase(),
      customer_name,
      customer_phone,
      total_amount,
      items: validatedItems,
      check_in_date: check_in_date ? new Date(check_in_date) : null,
      check_out_date: check_out_date ? new Date(check_out_date) : null,
      reservation_id,
      expires_at,
      ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      utm_source,
      utm_medium,
      utm_campaign
    });

    await invoice.save();

    // Send invoice email
    const payment_url = `${process.env.SITE_URL || 'http://localhost:3000'}/pay/${invoice.invoice_number}`;
    await sendInvoiceEmail(customer_email, {
      ...invoice.toObject(),
      payment_url
    });

    res.json({ 
      ok: true, 
      invoice: invoice.toObject(),
      payment_url
    });

  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create invoice' });
  }
});

// Get invoice by number
router.get('/:invoice_number', async (req, res) => {
  try {
    const { invoice_number } = req.params;
    const invoice = await Invoice.findOne({ invoice_number });
    
    if (!invoice) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }

    res.json({ ok: true, invoice });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get invoice' });
  }
});

// Process payment (simplified - in real implementation, integrate with Stripe/PayPal)
router.post('/:invoice_number/pay', async (req, res) => {
  try {
    const { invoice_number } = req.params;
    const { payment_method, payment_reference } = req.body;

    const invoice = await Invoice.findOne({ invoice_number });
    if (!invoice) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }

    if (invoice.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Invoice is not pending payment' });
    }

    if (new Date() > invoice.expires_at) {
      return res.status(400).json({ ok: false, error: 'Invoice has expired' });
    }

    // Update invoice status
    invoice.status = 'paid';
    invoice.payment_method = payment_method || 'manual';
    invoice.payment_reference = payment_reference;
    invoice.payment_date = new Date();
    invoice.paid_at = new Date();
    invoice.access_instructions = 'Enter the code on the lockbox in the 4th bedroom storage closet to access your items.';

    await invoice.save();

    // Send confirmation emails
    await sendPaymentConfirmationEmail(invoice.customer_email, invoice.toObject());
    await sendAdminInvoiceNotification(invoice.toObject());

    res.json({ 
      ok: true, 
      invoice: invoice.toObject(),
      message: 'Payment processed successfully'
    });

  } catch (error) {
    console.error('Payment error:', error);
    res.status(500).json({ ok: false, error: 'Failed to process payment' });
  }
});

// Cancel invoice
router.post('/:invoice_number/cancel', async (req, res) => {
  try {
    const { invoice_number } = req.params;
    const invoice = await Invoice.findOne({ invoice_number });
    
    if (!invoice) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }

    if (invoice.status !== 'pending') {
      return res.status(400).json({ ok: false, error: 'Only pending invoices can be cancelled' });
    }

    invoice.status = 'cancelled';
    invoice.cancelled_at = new Date();
    await invoice.save();

    res.json({ ok: true, invoice: invoice.toObject() });
  } catch (error) {
    console.error('Cancel invoice error:', error);
    res.status(500).json({ ok: false, error: 'Failed to cancel invoice' });
  }
});

// Admin: Get all invoices
router.get('/', async (req, res) => {
  try {
    const { page = 1, pageSize = 25, status, customer_email } = req.query;
    const skip = (page - 1) * pageSize;

    const filter = {};
    if (status) filter.status = status;
    if (customer_email) filter.customer_email = customer_email.toLowerCase();

    const [invoices, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(Number(pageSize))
        .lean(),
      Invoice.countDocuments(filter)
    ]);

    res.json({
      ok: true,
      invoices,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ ok: false, error: 'Failed to get invoices' });
  }
});

// Admin: Update invoice
router.put('/:invoice_number', async (req, res) => {
  try {
    const { invoice_number } = req.params;
    const { status, admin_notes, access_instructions, lockbox_code } = req.body;

    const invoice = await Invoice.findOne({ invoice_number });
    if (!invoice) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }

    if (status) invoice.status = status;
    if (admin_notes !== undefined) invoice.admin_notes = admin_notes;
    if (access_instructions) invoice.access_instructions = access_instructions;
    if (lockbox_code !== undefined) invoice.lockbox_code = lockbox_code || undefined;

    await invoice.save();

    res.json({ ok: true, invoice: invoice.toObject() });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update invoice' });
  }
});

// Admin: Delete invoice
router.delete('/:invoice_number', async (req, res) => {
  try {
    const { invoice_number } = req.params;
    const invoice = await Invoice.findOneAndDelete({ invoice_number });
    if (!invoice) {
      return res.status(404).json({ ok: false, error: 'Invoice not found' });
    }
    return res.json({ ok: true });
  } catch (error) {
    console.error('Delete invoice error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to delete invoice' });
  }
});

export default router; 