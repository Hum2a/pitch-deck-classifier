// src/components/Navigation.js

import React from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/Navigation.css'; // Optional styling

const Navigation = () => {
  return (
    <nav className="navigation">
      <NavLink exact to="/" activeClassName="active-link">
        Home
      </NavLink>
      <NavLink to="/round2" activeClassName="active-link">
        Round 2
      </NavLink>
    </nav>
  );
};

export default Navigation;
