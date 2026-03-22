function StatusMessage({ type = 'info', message }) {
  return <p className={`status ${type}`}>{message}</p>;
}

export default StatusMessage;
