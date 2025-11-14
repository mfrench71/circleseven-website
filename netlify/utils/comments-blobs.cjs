/**
 * Netlify Blobs Comment Storage Utility
 *
 * Stores comments in Netlify Blobs instead of Git for zero build consumption.
 */

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'comments';

function getCommentsStore() {
  return getStore(STORE_NAME);
}

function generateCommentId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return 'comment-' + timestamp + '-' + random;
}

async function createComment(commentData) {
  const store = getCommentsStore();
  const id = generateCommentId();
  
  const comment = {
    id,
    postSlug: commentData.postSlug,
    name: commentData.name,
    email: commentData.email,
    emailHash: commentData.emailHash,
    message: commentData.message,
    date: new Date().toISOString(),
    approved: false,
    createdAt: new Date().toISOString()
  };

  const key = commentData.postSlug + '/' + id;
  await store.setJSON(key, comment);
  await addToPendingList(id, commentData.postSlug);

  return comment;
}

async function getPendingComments() {
  const store = getCommentsStore();
  
  try {
    const pendingList = await store.get('pending-comments', { type: 'json' }) || [];
    const comments = await Promise.all(
      pendingList.map(async ({ id, postSlug }) => {
        try {
          const comment = await store.get(postSlug + '/' + id, { type: 'json' });
          return comment;
        } catch (error) {
          console.warn('Failed to load comment ' + id + ':', error.message);
          return null;
        }
      })
    );
    return comments.filter(c => c !== null);
  } catch (error) {
    console.error('Error getting pending comments:', error);
    return [];
  }
}

async function getApprovedComments(postSlug) {
  const store = getCommentsStore();
  
  try {
    const approvedList = await store.get('approved-comments-' + postSlug, { type: 'json' }) || [];
    const comments = await Promise.all(
      approvedList.map(async (id) => {
        try {
          const comment = await store.get(postSlug + '/' + id, { type: 'json' });
          return comment;
        } catch (error) {
          console.warn('Failed to load comment ' + id + ':', error.message);
          return null;
        }
      })
    );
    return comments.filter(c => c !== null);
  } catch (error) {
    console.error('Error getting approved comments for ' + postSlug + ':', error);
    return [];
  }
}

async function approveComment(commentId, postSlug) {
  const store = getCommentsStore();
  const key = postSlug + '/' + commentId;
  
  const comment = await store.get(key, { type: 'json' });
  if (!comment) {
    throw new Error('Comment not found');
  }

  comment.approved = true;
  comment.approvedAt = new Date().toISOString();
  
  await store.setJSON(key, comment);
  await removeFromPendingList(commentId, postSlug);
  await addToApprovedList(commentId, postSlug);

  return comment;
}

async function deleteComment(commentId, postSlug) {
  const store = getCommentsStore();
  const key = postSlug + '/' + commentId;
  
  await store.delete(key);
  await removeFromPendingList(commentId, postSlug);
  await removeFromApprovedList(commentId, postSlug);
}

async function addToPendingList(commentId, postSlug) {
  const store = getCommentsStore();
  const pendingList = await store.get('pending-comments', { type: 'json' }) || [];
  pendingList.push({ id: commentId, postSlug });
  await store.setJSON('pending-comments', pendingList);
}

async function removeFromPendingList(commentId, postSlug) {
  const store = getCommentsStore();
  const pendingList = await store.get('pending-comments', { type: 'json' }) || [];
  const updated = pendingList.filter(item => item.id !== commentId);
  await store.setJSON('pending-comments', updated);
}

async function addToApprovedList(commentId, postSlug) {
  const store = getCommentsStore();
  const key = 'approved-comments-' + postSlug;
  const approvedList = await store.get(key, { type: 'json' }) || [];
  if (!approvedList.includes(commentId)) {
    approvedList.push(commentId);
    await store.setJSON(key, approvedList);
  }
}

async function removeFromApprovedList(commentId, postSlug) {
  const store = getCommentsStore();
  const key = 'approved-comments-' + postSlug;
  const approvedList = await store.get(key, { type: 'json' }) || [];
  const updated = approvedList.filter(id => id !== commentId);
  await store.setJSON(key, updated);
}

module.exports = {
  createComment,
  getPendingComments,
  getApprovedComments,
  approveComment,
  deleteComment,
  generateCommentId
};
