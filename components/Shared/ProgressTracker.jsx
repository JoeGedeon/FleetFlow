.progress-tracker {
  display: flex;
  justify-content: space-between;
  margin: 16px 0;
}

.progress-step {
  text-align: center;
  flex: 1;
  position: relative;
}

.progress-step .dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #cbd5e1;
  margin: 0 auto 4px auto;
}

.progress-step.complete .dot {
  background-color: #22c55e;
}

.progress-step.active .dot {
  border: 2px solid #3b82f6;
}

.progress-step .label {
  font-size: 12px;
  color: #64748b;
}
