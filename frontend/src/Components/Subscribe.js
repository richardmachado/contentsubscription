export default function Subscribe({ token }) {
  const goToCheckout = async () => {
    const res = await fetch("http://localhost:5000/api/checkout", {
      method: "POST",
      headers: { Authorization: "Bearer " + token },
    });

    const data = await res.json();
    window.location.href = data.url;
  };

  return (
    <div className="container">
      <h2>This is a premium app — $5 to unlock</h2>
      <button onClick={goToCheckout}>Subscribe via Stripe</button>
    </div>
  );
}
