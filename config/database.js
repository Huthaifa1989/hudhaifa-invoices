// config/database.js
// قاعدة بيانات مؤقتة في الذاكرة (بدون MongoDB)

'use strict';

const bcryptjs = require('bcryptjs');
const crypto = require('crypto');

// ———————————————————————
// مولّد ObjectId شبيه MongoDB (24 حرفًا HEX ثابتة)
const generateObjectId = () => crypto.randomBytes(12).toString('hex');

// مخازن الذاكرة
const users = [];
const invoices = [];

// ———————————————————————
// نموذج المستخدم (محاكاة مبسّطة)
const User = {
  async findOne(query = {}) {
    if (query.username) return users.find(u => u.username === query.username) || null;
    if (query.email)    return users.find(u => u.email === query.email) || null;
    if (query._id)      return users.find(u => u._id === query._id) || null;
    return null;
  },

  async findById(id) {
    return users.find(u => u._id === id) || null;
  },

  async create(userData) {
    const user = {
      _id: generateObjectId(),
      username: userData.username,
      email: userData.email,
      password: await bcryptjs.hash(String(userData.password || ''), 12),
      name: userData.name || '',
      role: userData.role || 'user',
      isActive: true,
      createdAt: new Date(),
      lastLogin: null
    };

    // دوال أسلوبية تحاكي Mongoose
    user.comparePassword = async function (candidatePassword) {
      return bcryptjs.compare(String(candidatePassword || ''), this.password);
    };

    user.save = async function () {
      const i = users.findIndex(u => u._id === this._id);
      if (i >= 0) users[i] = { ...this };
      else users.push({ ...this });
      return this;
    };

    users.push(user);
    return user;
  }
};

// ———————————————————————
// أداة نتيجة استعلام قابلة للسَّلسلة (sort/limit/populate)
class QueryResult {
  constructor(rows) {
    this.rows = rows;
  }
  populate() { return this; } // لا حاجة فعلية لأننا نعيد createdBy ككائن جاهز
  sort(sortObj) {
    // يدعم {createdAt:-1} أو {createdAt:1}
    if (sortObj && sortObj.createdAt) {
      const dir = sortObj.createdAt;
      this.rows.sort((a, b) =>
        dir < 0 ? new Date(b.createdAt) - new Date(a.createdAt)
                : new Date(a.createdAt) - new Date(b.createdAt));
    }
    return this;
  }
  limit(n) {
    this.rows = this.rows.slice(0, Number(n) || this.rows.length);
    return this.rows; // نعيد Array عند limit مثل معظم الاستخدامات عندكم
  }
  toArray() { return [...this.rows]; }
  [Symbol.iterator]() { return this.rows[Symbol.iterator](); }
}

// ———————————————————————
// نموذج الفاتورة (محاكاة مبسّطة)
const Invoice = {
  async find(query = {}) {
    let result = [...invoices];

    if (query.status) {
      result = result.filter(inv => inv.status === query.status);
    }
    if (query.clientName) {
      const q = String(query.clientName).toLowerCase();
      result = result.filter(inv => inv.clientName && inv.clientName.toLowerCase().includes(q));
    }

    // إرفاق بيانات المُنشئ
    const withUsers = result.map(inv => {
      const creator = users.find(u => u._id === inv.createdBy);
      return {
        ...inv,
        createdBy: creator
          ? { _id: creator._id, name: creator.name, username: creator.username, email: creator.email }
          : { _id: inv.createdBy, name: 'مجهول', username: 'unknown', email: 'unknown@system.local' }
      };
    });

    // نعيد كائن قابل للسّلسلة ثم يتحول Array عند limit()
    return new QueryResult(withUsers);
  },

  async findById(id) {
    const inv = invoices.find(x => x._id === id);
    if (!inv) return null;

    const creator = users.find(u => u._id === inv.createdBy);
    const doc = {
      ...inv,
      createdBy: creator
        ? { _id: creator._id, name: creator.name, username: creator.username, email: creator.email }
        : { _id: inv.createdBy, name: 'مجهول', username: 'unknown', email: 'unknown@system.local' },

      async save() {
        this.updatedAt = new Date();
        const i = invoices.findIndex(x => x._id === this._id);
        if (i >= 0) invoices[i] = { ...this };
        return this;
      },

      async remove() {
        const i = invoices.findIndex(x => x._id === this._id);
        if (i >= 0) invoices.splice(i, 1);
        return this;
      },

      async populate() { return this; }
    };

    return doc;
  },

  async countDocuments(query = {}) {
    const list = await this.find(query);
    return list.toArray().length;
  },

  async create(data) {
    const invoice = {
      _id: generateObjectId(),
      invoiceNumber: data.invoiceNumber || `INV-${String(invoices.length + 1).padStart(6, '0')}`,
      clientName: data.clientName,
      clientEmail: data.clientEmail || '',
      clientPhone: data.clientPhone || '',
      clientAddress: data.clientAddress || '',
      amount: Number.parseFloat(data.amount) || 0,
      tax: Number.parseFloat(data.tax) || 0,
      total: Number.parseFloat(data.total ?? (Number(data.amount) + Number(data.tax))) || 0,
      status: data.status || 'pending',
      date: data.date ? new Date(data.date) : new Date(),
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      items: Array.isArray(data.items) ? data.items : [],
      notes: data.notes || '',
      createdBy: data.createdBy,
      paymentMethod: data.paymentMethod || 'bank_transfer',
      paidAt: data.paidAt ? new Date(data.paidAt) : null,
      category: data.category || 'general',
      priority: data.priority || 'normal',
      tags: Array.isArray(data.tags) ? data.tags : [],
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
      source: data.source || 'system',
      currency: data.currency || 'SAR',
      exchangeRate: Number(data.exchangeRate) || 1,
      discountAmount: Number.parseFloat(data.discountAmount) || 0,
      discountPercent: Number.parseFloat(data.discountPercent) || 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (!invoice.clientName || !String(invoice.clientName).trim()) {
      throw new Error('اسم العميل مطلوب');
    }
    if (invoice.total <= 0) {
      throw new Error('المبلغ الإجمالي يجب أن يكون أكبر من صفر');
    }

    invoice.save = async function () {
      this.updatedAt = new Date();
      const i = invoices.findIndex(x => x._id === this._id);
      if (i >= 0) invoices[i] = { ...this };
      return this;
    };

    invoice.remove = async function () {
      const i = invoices.findIndex(x => x._id === this._id);
      if (i >= 0) invoices.splice(i, 1);
      return this;
    };

    invoice.updateStatus = async function (newStatus) {
      this.status = newStatus;
      if (newStatus === 'paid' && !this.paidAt) this.paidAt = new Date();
      return this.save();
    };

    invoices.push(invoice);
    console.log(`📄 تم إنشاء فاتورة جديدة: ${invoice.invoiceNumber}`);
    return invoice;
  },

  async insertMany(list) {
    const created = [];
    for (const data of list || []) {
      try {
        const inv = await this.create(data);
        created.push(inv);
      } catch (e) {
        console.error(`خطأ في إنشاء الفاتورة: ${e.message}`);
      }
    }
    return created;
  }
};

// ———————————————————————
// تهيئة البيانات الافتراضية
const connectDB = async () => {
  try {
    console.log('🗄️ تشغيل قاعدة البيانات المؤقتة في الذاكرة...');
    await createDefaultUsers();
    await createSampleInvoices();
    console.log('✅ قاعدة البيانات المؤقتة جاهزة!');
    console.log(`👥 المستخدمين: ${users.length}`);
    console.log(`📋 الفواتير: ${invoices.length}`);
  } catch (err) {
    console.error('❌ خطأ في إعداد قاعدة البيانات المؤقتة:', err);
    process.exit(1);
  }
};

const createDefaultUsers = async () => {
  users.length = 0;

  const admin = await User.create({
    username: 'hudhaifa',
    email: 'asd1461989@gmail.com',
    password: 'admin123',
    name: 'حذيفة - المدير',
    role: 'admin'
  });

  await User.create({
    username: 'user',
    email: 'user@invoices.com',
    password: 'user123',
    name: 'مستخدم عادي',
    role: 'user'
  });

  console.log('👑 تم إنشاء حساب المدير:', admin.name);
};

const createSampleInvoices = async () => {
  invoices.length = 0;

  const admin = users.find(u => u.username === 'hudhaifa');
  if (!admin) return;

  await Invoice.insertMany([
    {
      clientName: 'شركة التقنية المتقدمة',
      clientEmail: 'info@tech-company.com',
      amount: 5000,
      tax: 750,
      total: 5750,
      status: 'paid',
      items: [{ name: 'استشارة تقنية متقدمة', quantity: 10, price: 500, total: 5000 }],
      createdBy: admin._id,
      paidAt: new Date(),
      source: 'system'
    },
    {
      clientName: 'مؤسسة الابتكار الرقمي',
      clientEmail: 'contact@innovation.sa',
      amount: 3500,
      tax: 525,
      total: 4025,
      status: 'pending',
      items: [
        { name: 'تصميم واجهة مستخدم', quantity: 1, price: 2000, total: 2000 },
        { name: 'برمجة النظام', quantity: 1, price: 1500, total: 1500 }
      ],
      createdBy: admin._id,
      source: 'system'
    }
  ]);

  console.log('📋 تم إنشاء فواتير تجريبية');
};

// (اختياري) أدوات فحص/اختبار
const __memory = {
  _users: users,
  _invoices: invoices,
  reset() { users.length = 0; invoices.length = 0; }
};

module.exports = { connectDB, User, Invoice, __memory };
