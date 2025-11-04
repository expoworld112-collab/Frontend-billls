import React, { useState } from "react";
import axios from "axios";

const BillForm = () => {
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [gstRate, setGstRate] = useState(18);
  const [products, setProducts] = useState([{ name: "", price: "", quantity: "" }]);
  const [message, setMessage] = useState("");

  // Handle adding a new product row
  const addProduct = () => {
    setProducts([...products, { name: "", price: "", quantity: "" }]);
  };

  // Handle input change for products
  const handleProductChange = (index, field, value) => {
    const newProducts = [...products];
    newProducts[index][field] = value;
    setProducts(newProducts);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build payload for backend
    const payload = {
      from: { name: fromName },
      to: { name: toName },
      transport: { id: "", type: "" }, // Optional
      gstRate: Number(gstRate),
      products: products.map(p => ({
        name: p.name,
        price: Number(p.price),
        quantity: Number(p.quantity)
      }))
    };

    try {
      const res = await axios.post("http://localhost:5000/api/bills", payload, {
        headers: { "Content-Type": "application/json" }
      });
      console.log("Saved bill:", res.data);
      setMessage("✅ Bill saved successfully!");
      // Reset form
      setFromName("");
      setToName("");
      setGstRate(18);
      setProducts([{ name: "", price: "", quantity: "" }]);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to save bill. Check console.");
    }
  };

  return (
    <div>
      <h2>Create New Bill</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>From Name:</label>
          <input value={fromName} onChange={e => setFromName(e.target.value)} required />
        </div>
        <div>
          <label>To Name:</label>
          <input value={toName} onChange={e => setToName(e.target.value)} required />
        </div>
        <div>
          <label>GST Rate:</label>
          <input
            type="number"
            value={gstRate}
            onChange={e => setGstRate(e.target.value)}
            required
          />
        </div>

        <h3>Products</h3>
        {products.map((p, i) => (
          <div key={i}>
            <input
              placeholder="Name"
              value={p.name}
              onChange={e => handleProductChange(i, "name", e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Price"
              value={p.price}
              onChange={e => handleProductChange(i, "price", e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Quantity"
              value={p.quantity}
              onChange={e => handleProductChange(i, "quantity", e.target.value)}
              required
            />
          </div>
        ))}
        <button type="button" onClick={addProduct}>
          + Add Product
        </button>

        <br />
        {/* <button type="submit">Save Bill</button> */}
     <button
  type="button"
  className="submit-btn"
  onClick={async () => {
    await submitBill();
    generatePDF(false);
  }}
>
  Submit Bill & Generate PDF
</button>

      </form>
      <p>{message}</p>
    </div>
  );
};

export default BillForm;
