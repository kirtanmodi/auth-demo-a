const { Client } = require("pg");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

exports.handler = async (event) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "Merchant created successfully" }),
  };
};
