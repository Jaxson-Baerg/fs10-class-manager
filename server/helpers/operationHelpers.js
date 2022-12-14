const formatDate = (timestamp) => { // 2022-12-15T14:30:00.000Z
  const dateStr = `${timestamp}`; // "Thu Dec 15 2022 07:30:00 GMT-0700 (Mountain Standard Time)"

  const tempDate = dateStr.split(' '); // tempDate = ["Thu", "Dec", "15", "2022", "07:30:00", "GMT-0700", "(Mountain", "Standard" ,"Time)"]
  return `${tempDate[0]} ${tempDate[1]} ${tempDate[2]}, ${tempDate[3]}`; // "Thu Dec 15, 2022"
};

const formatTime = (timestamp, timezone) => {
  const dateStr = `${timestamp}`;

  const tempDate = dateStr.split(' '); // tempDate = ["Thu", "Dec", "15", "2022", "07:30:00", "GMT-0700", "(Mountain", "Standard" ,"Time)"]
  return `${tempDate[4].split(':')[0] > 12 ? tempDate[4].split(':')[0] - 12 : tempDate[4].split(':')[0].split('')[0] === "0" ? tempDate[4].split(':')[0].split('')[1] : tempDate[4].split(':')[0]}:${tempDate[4].split(':')[1]} ${tempDate[4].split(':')[0] > 11 ? "PM" : "AM"} ${timezone ? `${tempDate[6]} ${tempDate[7]} ${tempDate[8]}` : ''}`;
};

module.exports = {
  formatDate,
  formatTime
};