// UserRef.jsx
import React from 'react';

const UserRef = (props) => {
  const { record } = props;

  // fallback to ID if username not populated
  const user = record?.populated?.['comments.author'] || record?.params?.['comments.author'];

  return (
    <div>
      {user?.title || user?.email || user || 'Unknown'}
    </div>
  );
};

export default UserRef;
