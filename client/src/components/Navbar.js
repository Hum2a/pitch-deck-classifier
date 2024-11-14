import React from 'react';
import { AppBar, Toolbar, Typography, Image } from '@mui/material';
import '../styles/Navbar.css';

const Navbar = () => {
  return (
    <AppBar position="static" className="navbar">
      <Toolbar className="navbar-toolbar">
        <Typography variant="h6" className="navbar-company">
          <img src={`${process.env.PUBLIC_URL}/Contrarian.png`} alt="logo" />
        </Typography>

        <Typography variant="h6" className="navbar-title">
          Pitch Deck Classifier
        </Typography>

        <div className="navbar-links">
          <a href="/" className="navbar-link">Home</a>
          <a href="/about" className="navbar-link">About</a>
          <a href="/contact" className="navbar-link">Contact</a>
          <i className="navbar-icon fas fa-cogs"></i>
        </div>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
