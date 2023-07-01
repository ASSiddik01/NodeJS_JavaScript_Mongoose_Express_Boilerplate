const { calculatePagination } = require("../../helpers/paginationHelpers");
const { userSearchableFields } = require("../constants/user.constant");
const { User } = require("../models/user.model");
const { generateUserId } = require("../utilities/user.utils");

exports.createUserService = async (payload) => {
  payload.role = "user";
  payload.id = await generateUserId();
  const user = await User.create(payload);
  if (!user) {
    throw new Error("User create failed");
  }
  const result = await User.findById(user._id);
  return result;
};

exports.getAllUsersService = async (paginationOptions, filters) => {
  const { page, limit, skip, sortBy, sortOrder } =
    calculatePagination(paginationOptions);
  const { searchTerm, ...filtersData } = filters;
  let andConditions = [];

  // search on the field
  if (searchTerm) {
    andConditions.push({
      $or: userSearchableFields.map((field) => ({
        [field]: {
          $regex: searchTerm,
          $options: "i",
        },
      })),
    });
  }

  // filtering on field
  if (Object.keys(filtersData).length) {
    andConditions.push({
      $and: Object.entries(filtersData).map(([field, value]) => ({
        [field]: {
          $regex: value,
          $options: "i",
        },
      })),
    });
  }

  // sorting
  let sortConditions = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const whereConditions =
    andConditions.length > 0 ? { $and: andConditions } : {};
  // output
  const result = await User.find(whereConditions)
    .populate("")
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await User.countDocuments(whereConditions);
  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

exports.getSingleUserService = async (id) => {
  const result = await User.findById(id);
  if (!result) {
    throw new Error("User not found !");
  }
  return result;
};

exports.updateUserService = async (_id, payload) => {
  const isExist = await User.findById(_id);
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found !");
  }

  const { name, role, id, ...userData } = payload;
  const updatedUserData = { ...userData };

  // dynamicallly handel name
  if (name && Object.keys(name).length > 0) {
    Object.keys(name).forEach((key) => {
      const dataKey = `name.${key}`;
      updatedUserData[dataKey] = name[key];
    });
  }

  const result = await User.findOneAndUpdate({ _id }, updatedUserData, {
    new: true,
  });

  if (!result) {
    throw new Error("User update failed");
  }

  return result;
};

exports.deleteUserService = async (id) => {
  const isExist = await User.findById(id);
  if (!isExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found !");
  }

  const result = await User.findByIdAndDelete(id);

  if (!result) {
    throw new Error("User delete failed");
  }
  return result;
};