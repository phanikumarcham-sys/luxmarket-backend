const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name, phone, city } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name, phone, city) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, name',
      [email, hashedPassword, name, phone, city]
    );
    
    const token = jwt.sign({ userId: result.rows[0].id }, process.env.JWT_SECRET);
    res.json({ token, user: result.rows[0] });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);
    res.json({ token, user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Create listing
app.post('/api/listings', authenticateToken, async (req, res) => {
  try {
    const { title, description, price, category, condition, images, location } = req.body;
    
    const result = await pool.query(
      `INSERT INTO listings (user_id, title, description, price, category, condition, images, location, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') RETURNING *`,
      [req.user.userId, title, description, price, category, condition, images, location]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get listings
app.get('/api/listings', async (req, res) => {
  try {
    const { category, city, minPrice, maxPrice, search } = req.query;
    let query = `
      SELECT l.*, u.name as seller_name, u.city as seller_city 
      FROM listings l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.status = 'active'
    `;
    const params = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND l.category = $${paramIndex++}`;
      params.push(category);
    }
    if (city) {
      query += ` AND (u.city ILIKE $${paramIndex++} OR l.location ILIKE $${paramIndex++})`;
      params.push(`%${city}%`, `%${city}%`);
    }
    if (minPrice) {
      query += ` AND l.price >= $${paramIndex++}`;
      params.push(parseFloat(minPrice));
    }
    if (maxPrice) {
      query += ` AND l.price <= $${paramIndex++}`;
      params.push(parseFloat(maxPrice));
    }
    if (search) {
      query += ` AND (l.title ILIKE $${paramIndex++} OR l.description ILIKE $${paramIndex++})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY l.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single listing
app.get('/api/listings/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT l.*, u.name as seller_name, u.phone as seller_phone, u.city as seller_city 
      FROM listings l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('LuxMarket API running on port 3000');
});