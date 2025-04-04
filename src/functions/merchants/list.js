const { Client } = require("pg");
const AWS = require("aws-sdk");

exports.handler = async (event) => {
  // Return response
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ message: "Merchants listed successfully" }),
  };
};
