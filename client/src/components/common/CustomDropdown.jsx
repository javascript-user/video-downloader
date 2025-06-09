// CustomDropdown.jsx
import React, { useState } from "react";

const CustomDropdown = ({ options, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  const handleSelect = (option) => {
    setSelectedOption(option);
    setIsOpen(false);
    onSelect(option); // Pass selected value to parent
  };

  return (
    <div className="relative inline-block text-left w-64">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex justify-between items-center w-full px-4 py-2 text-sm font-medium text-[#5244f7] bg-[#0d0d0d] border border-[#1d1d1d] rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-[#0f0f18]"
      >
        {selectedOption ? (
          <span>
            {selectedOption.label}{" "}
            <small className="">({selectedOption.filesize})</small>
          </span>
        ) : (
          "Select an option"
        )}

        <svg
          className="-mr-1 ml-2 h-6 w-6 rounded-full border-2 text-[#5244f7]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <ul className="absolute z-10 mt-2 w-full bg-[#0d0d0d] rounded-md shadow-lg max-h-60 overflow-auto focus:outline-none">
          {options.map((option) => (
            <li
              key={option.format_id}
              onClick={() => handleSelect(option)}
              className="px-4 py-2 text-sm text-white cursor-pointer hover:bg-[#1b176b] flex justify-between"
            >
              <span>{option.label}</span>
              <span>{option.filesize}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CustomDropdown;
