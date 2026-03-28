const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/listings', (req, res) => {
  res.json([
    {id:1, title:'IKEA Sofa €50', city:'Luxembourg City', price:50, image:'https://via.placeholder.com/300x200'},
    {id:2, title:'Bike €100', city:'Esch-sur-Alzette', price:100, image:'https://via.placeholder.com/300x200'},
    {id:3, title:'Sports Shoes €25', city:'Dudelange', price:25, image:'https://via.placeholder.com/300x200'}
  ]);
});

app.listen(3000, () => {
  console.log('🚀 LuxMarket Backend: http://localhost:3000');
  console.log('📱 Test listings: http://localhost:3000/api/listings');
});