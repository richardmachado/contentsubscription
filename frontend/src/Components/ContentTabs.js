import handlePurchase from "./HandlePurchase";

export default function ContentTabs({ tab, setTab, purchased, unpurchased }) {
  return (
    <>
      <div className="tab-buttons">
        <button
          className={tab === "purchased" ? "active-tab" : ""}
          onClick={() => setTab("purchased")}
        >
          Purchased
        </button>
        <button
          className={tab === "explore" ? "active-tab" : ""}
          onClick={() => setTab("explore")}
        >
          Explore More
        </button>
      </div>

      {tab === "purchased" ? (
        <div className="content-list">
          {purchased.length === 0 ? (
            <p>You haven’t purchased any content yet.</p>
          ) : (
            purchased.map((item) => (
              <div key={item.id} className="content-box">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button
                  className="view-button"
                  onClick={() => alert("Enjoy your content!")}
                >
                  View
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="tab-content">
          {unpurchased.length === 0 ? (
            <p style={{ fontStyle: "italic", color: "#888" }}>
              🎉 You’ve purchased all current content. Stay tuned for new
              content coming soon!
            </p>
          ) : (
            unpurchased.map((item) => (
              <div key={item.id} className="content-box alt">
                <h4>{item.title}</h4>
                <p>{item.description}</p>
                <button
                  className="buy-button"
                  onClick={() => handlePurchase(item.id)}
                >
                  Buy for ${item.price / 100}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
