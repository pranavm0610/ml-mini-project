import { useState, useEffect } from "react";

export default function App() {
  const [title, setTitle] = useState("");
  const [abstract, setAbstract] = useState("");
  const [predictedLabels, setPredictedLabels] = useState([]);
  const [error, setError] = useState(null);
  const [availableModels, setAvailableModels] = useState({ traditional: [], ensemble: [] });
  const [selectedTraditionalModel, setSelectedTraditionalModel] = useState("");
  const [selectedEnsembleModel, setSelectedEnsembleModel] = useState("");
  const [activeModelType, setActiveModelType] = useState("traditional"); // "traditional" or "ensemble"
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  // Fetch available models when component mounts
  useEffect(() => {
    fetchAvailableModels();
  }, []);

  const fetchAvailableModels = async () => {
    try {
      setModelLoading(true);
      const response = await fetch("https://hybrid-unity-456403-r1.rj.r.appspot.com/models/", {
        method: "GET",
        mode: "no-cors"
      });
      if (!response.ok) {
        throw new Error("Failed to fetch available models");
      }
      
      const data = await response.json();
      setAvailableModels(data.available_models || { traditional: [], ensemble: [] });
    } catch (error) {
      console.error("Error fetching models:", error);
      setError("Failed to load available models. Please refresh the page.");
    } finally {
      setModelLoading(false);
    }
  };

  const handleTraditionalModelChange = (e) => {
    setSelectedTraditionalModel(e.target.value);
    setSelectedEnsembleModel("");
    setActiveModelType("traditional");
  };

  const handleEnsembleModelChange = (e) => {
    setSelectedEnsembleModel(e.target.value);
    setSelectedTraditionalModel("");
    setActiveModelType("ensemble");
  };

  const handlePredict = async () => {
    if (!title.trim() && !abstract.trim()) {
      setError("Please enter a title or abstract");
      return;
    }

    const selectedModel = activeModelType === "traditional" 
      ? selectedTraditionalModel 
      : selectedEnsembleModel;
      
    if (!selectedModel) {
      setError("Please select a model for prediction");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch("https://hybrid-unity-456403-r1.rj.r.appspot.com/classify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          title, 
          abstract,
          model: selectedModel === "default" ? null : selectedModel
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get a response from the server");
      }

      const data = await response.json();
      setPredictedLabels(data["predicted_labels"] || data["Predicted labels"] || []);
    } catch (error) {
      console.error("Error predicting:", error);
      setError("Prediction failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      position: "relative",
      minHeight: "100vh", 
      backgroundColor: "#f0f8ff", 
      display: "flex", 
      flexDirection: "column", 
      alignItems: "center", 
      overflowX: "hidden",
      padding: "20px", 
      width: "98%",
      top: "-20px"
    }}>
      <div style={{ 
        display: "flex", 
        alignItems: "center",
        backgroundColor: "#005baa",
        color: "white", 
        padding: "15px", 
        overflowX: 'hidden',
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", 
        width: "100%", 
        position: "relative" 
      }}>
        <img src="ssn.png" alt="College Logo" style={{ height: "60px" }} />
        <h1 style={{ 
          marginLeft: "15px", 
          fontSize: "22px", 
          fontWeight: "bold", 
          textTransform: "uppercase" 
        }}>
          SRI SIVASUBRAMANIYA NADAR COLLEGE OF ENGINEERING
        </h1>
      </div>

      <div style={{ 
        backgroundColor: "white", 
        padding: "20px", 
        marginTop: "20px", 
        borderRadius: "10px", 
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)", 
        width: "100%", 
        maxWidth: "600px" 
      }}>
        <h2 style={{ 
          textAlign: "center", 
          marginBottom: "15px", 
          fontSize: "20px", 
          fontWeight: "bold" 
        }}>Predict Domains for Research Paper</h2>
        
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          gap: "15px" 
        }}>
          {!modelLoading && (
            <div>
              <div style={{ marginBottom: "15px" }}>
                <div style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "10px"
                }}>
                  <button 
                    onClick={() => {
                      setActiveModelType("traditional");
                      setSelectedEnsembleModel("");
                    }}
                    style={{
                      padding: "8px 15px",
                      backgroundColor: activeModelType === "traditional" ? "#005baa" : "#e0e0e0",
                      color: activeModelType === "traditional" ? "white" : "#333",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontWeight: activeModelType === "traditional" ? "bold" : "normal",
                      flex: 1,
                      height: "50px"
                    }}
                  >
                    Traditional Models
                  </button>
                  <button 
                    onClick={() => {
                      setActiveModelType("ensemble");
                      setSelectedTraditionalModel("");
                    }}
                    style={{
                      padding: "8px 15px",
                      backgroundColor: activeModelType === "ensemble" ? "#005baa" : "#e0e0e0",
                      color: activeModelType === "ensemble" ? "white" : "#333",
                      border: "none",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontWeight: activeModelType === "ensemble" ? "bold" : "normal",
                      flex: 1,
                      height: "50px"
                    }}
                  >
                    Ensemble Models
                  </button>
                </div>

                {activeModelType === "traditional" && (
                  <div>
                    <label htmlFor="traditional-model-select" style={{ display: "block", marginBottom: "5px" }}>
                      Select Traditional Model:
                    </label>
                    <select
                      id="traditional-model-select"
                      value={selectedTraditionalModel}
                      onChange={handleTraditionalModelChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc"
                      }}
                    >
                      <option value="">-- Select a Traditional Model --</option>
                      {availableModels.traditional.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeModelType === "ensemble" && (
                  <div>
                    <label htmlFor="ensemble-model-select" style={{ display: "block", marginBottom: "5px" }}>
                      Select Ensemble Model:
                    </label>
                    <select
                      id="ensemble-model-select"
                      value={selectedEnsembleModel}
                      onChange={handleEnsembleModelChange}
                      style={{
                        width: "100%",
                        padding: "10px",
                        borderRadius: "5px",
                        border: "1px solid #ccc"
                      }}
                    >
                      <option value="">-- Select an Ensemble Model --</option>
                      {availableModels.ensemble.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {modelLoading && (
            <div style={{ color: "#666", fontStyle: "italic" }}>
              Loading available models...
            </div>
          )}
          
          <input
            type="text"
            placeholder="Enter Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              width: "96%",
              height: "40px"
            }}
          />
          
          <textarea
            placeholder="Enter Abstract"
            value={abstract}
            onChange={(e) => setAbstract(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "5px",
              border: "1px solid #ccc",
              width: "96%",
              height: "120px",
              resize: "vertical",
              fontFamily: "arial"
            }}
          />
          
          <button
            onClick={handlePredict}
            disabled={isLoading || (!selectedTraditionalModel && !selectedEnsembleModel)}
            style={{
              padding: "10px",
              borderRadius: "5px",
              border: "none",
              backgroundColor: (!selectedTraditionalModel && !selectedEnsembleModel) || isLoading ? "#cccccc" : "#005baa",
              color: "white",
              cursor: (!selectedTraditionalModel && !selectedEnsembleModel) || isLoading ? "not-allowed" : "pointer",
              fontWeight: "bold"
            }}
          >
            {isLoading ? "Processing..." : "Predict"}
          </button>
        </div>
        
        {error && <p style={{ color: "#d32f2f", marginTop: "10px" }}>{error}</p>}
        
        {predictedLabels.length > 0 && (
          <div style={{
            marginTop: "15px",
            padding: "15px",
            borderRadius: "5px",
            backgroundColor: "#f5f5f5"
          }}>
            <h3 style={{ fontWeight: "bold", marginBottom: "10px", color: "#005baa" }}>
              Predicted Domains using {activeModelType === "traditional" ? selectedTraditionalModel : selectedEnsembleModel}:
            </h3>
            <ul style={{ listStyleType: "disc", paddingLeft: "20px" }}>
              {predictedLabels.map((label, index) => (
                <li key={index} style={{ marginBottom: "5px" }}>{label}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}