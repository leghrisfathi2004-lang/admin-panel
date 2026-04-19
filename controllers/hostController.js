const { validationResult } = require('express-validator');
const Host = require('../models/Host');
const { audit } = require('../middleware/audit');

exports.list = async (req, res) => {
  const hosts = await Host.find().sort({ priority: -1, createdAt: -1 }).lean();
  res.json({ ok: true, hosts });
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, message: 'Invalid input', errors: errors.array() });
  }

  try {
    const { name, url, notes, priority, enabled } = req.body;
    const host = await Host.create({
      name,
      url,
      notes: notes || '',
      priority: priority ?? 100,
      enabled: enabled ?? true,
      createdBy: req.user._id,
    });
    await audit({
      req,
      action: 'host.create',
      target: { type: 'Host', id: String(host._id), name: host.name },
    });
    res.status(201).json({ ok: true, host });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, message: 'A host with that URL already exists' });
    }
    res.status(400).json({ ok: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, message: 'Invalid input', errors: errors.array() });
  }

  try {
    const updates = (({ name, url, notes, priority, enabled }) => ({
      name,
      url,
      notes,
      priority,
      enabled,
    }))(req.body);

    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const host = await Host.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    if (!host) return res.status(404).json({ ok: false, message: 'Host not found' });
    await audit({
      req,
      action: 'host.update',
      target: { type: 'Host', id: String(host._id), name: host.name },
      meta: updates,
    });
    res.json({ ok: true, host });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, message: 'A host with that URL already exists' });
    }
    res.status(400).json({ ok: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  const host = await Host.findByIdAndDelete(req.params.id);
  if (!host) return res.status(404).json({ ok: false, message: 'Host not found' });
  await audit({
    req,
    action: 'host.delete',
    target: { type: 'Host', id: String(host._id), name: host.name },
  });
  res.json({ ok: true });
};

exports.publicList = async (req, res) => {
  const hosts = await Host.find({ enabled: true })
    .sort({ priority: -1 })
    .select('url priority -_id')
    .lean();
  res.json({ ok: true, hosts });
};

exports.legacyAuth = async (req, res) => {
  const hosts = await Host.find({ enabled: true })
    .sort({ priority: -1 })
    .lean();

  const urls = hosts.map((h, i) => ({
    id: String(i + 1),
    name: h.name || `Server ${i + 1}`,
    url: h.url,
    type: '0',
    is_protected: '0',
  }));

  res.json({
    mac_registered: true,
    urls,
    theme: '1',
    app_version: '50.0',
    apk_link: '',
    home_url1: '',
    home_url2: '',
    expire_date: '2099-12-31',
    lock: 0,
    pin: '0000',
    parent_control: '0000',
    parent_synced: 1,
    is_trial: 0,
    plan_id: '1',
    price: '0',
    languages: [],
    qr_url: '',
    qr_url_short: '',
    note_title: '',
    note_content: '',
    is_google_pay: false,
  });
};

exports.legacyUpdate = async (req, res) => {
  res.json({ success: true });
};
