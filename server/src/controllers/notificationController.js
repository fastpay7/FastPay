const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/notifications
const getNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unread = notifications.filter(n => !n.read).length;
  res.json({ notifications, unread });
};

// PUT /api/notifications/read-all
const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  res.json({ success: true });
};

// PUT /api/notifications/:id/read
const markRead = async (req, res) => {
  await prisma.notification.update({ where: { id: req.params.id }, data: { read: true } });
  res.json({ success: true });
};

module.exports = { getNotifications, markAllRead, markRead };
