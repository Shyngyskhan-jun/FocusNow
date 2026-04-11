export function errorHandler(err, req, res, _next) {
  console.error(err);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
}