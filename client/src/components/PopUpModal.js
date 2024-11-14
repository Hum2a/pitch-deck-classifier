// PopupModal.js
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { styled } from '@mui/system';

// Custom styles for the modal components
const StyledDialog = styled(Dialog)({
  '& .MuiPaper-root': {
    borderRadius: '15px',
    background: 'linear-gradient(135deg, #fff 30%, #f3f4f6 90%)',
    boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)',
    padding: '20px',
    textAlign: 'center',
    maxWidth: '400px',
    animation: 'fadeIn 0.3s ease-out',
  },
  '@keyframes fadeIn': {
    '0%': { opacity: 0, transform: 'scale(0.9)' },
    '100%': { opacity: 1, transform: 'scale(1)' },
  },
});

const StyledDialogTitle = styled(DialogTitle)({
  fontWeight: 'bold',
  color: '#3c3c3c',
  fontSize: '1.5rem',
});

const StyledDialogContent = styled(DialogContent)({
  color: '#4f4f4f',
  fontSize: '1rem',
  marginBottom: '20px',
});

const AnimatedButton = styled(Button)({
  fontWeight: 'bold',
  fontSize: '1rem',
  textTransform: 'none',
  padding: '10px 20px',
  margin: '5px',
  borderRadius: '25px',
  boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',
  background: 'linear-gradient(45deg, #ff6b6b 30%, #f55d5d 90%)',
  color: '#fff',
  '&:hover': {
    background: 'linear-gradient(45deg, #f55d5d 30%, #ff6b6b 90%)',
    transform: 'scale(1.05)',
  },
  animation: 'pulse 1.5s infinite ease-in-out',
  '@keyframes pulse': {
    '0%': { transform: 'scale(1)' },
    '50%': { transform: 'scale(1.1)' },
    '100%': { transform: 'scale(1)' },
  },
});

const PopupModal = ({ open, onClose, title, children, onConfirm }) => {
  return (
    <StyledDialog open={open} onClose={onClose} aria-labelledby="popup-modal-title">
      <StyledDialogTitle id="popup-modal-title">{title}</StyledDialogTitle>
      <StyledDialogContent>{children}</StyledDialogContent>
      <DialogActions>
        <AnimatedButton onClick={onClose} style={{ background: '#d3d3d3' }}>
          Cancel
        </AnimatedButton>
        {onConfirm && (
          <AnimatedButton onClick={onConfirm} style={{ background: '#ff6b6b' }}>
            Confirm
          </AnimatedButton>
        )}
      </DialogActions>
    </StyledDialog>
  );
};

export default PopupModal;
