const { Op } = require('sequelize');
const activityModel = require('../model/activityModel');
const User = require('../model/userModel');
const { parse } = require('yamljs');
User.sync();

const allowTags = ["exercise", "study"];

/**
 * The function would format an activity instance with more detail, including the creator and participants related data
 * @param {*} activity_id 
 * @returns activity instance including creator and particpants data 
 * 
 * TODO: maybe directly add include the user data to an instance passed of, instead of doing query again
 */
async function returnActivity(activity_id, is_one_time) {
    var includeModels = [
        {
            model: User,
            as: 'Creator',
        },
        {
            model: User,
            as: 'Participants',
        },
    ];

    var activity = await activityModel.Activities.findByPk(activity_id, { include: includeModels });

    var activityJson = activity.toJSON();

    console.log("activity id", activity.activity_id);
    var activityTags = await activityModel.ActivityTag.findAll(
        {
            where: {
                activities: activity.activity_id,
            }
        }
    );

    console.log("tag instances length", activityTags.length);

    activityJson.tags = [];
    activityTags.forEach(async activityTag => {
        tag = await activityModel.Tag.findByPk(activityTag.tag);

        console.log("tag name is", tag.name);
        activityJson.tags.push(tag.name);
    });

    console.log(`tags ${activityJson.tags}`);

    if (!is_one_time) {
        activityJson.date = [];
        longTermInstances = await activityModel.LongTermActivities.findAll(
            {
                where: {
                    activity_id: activity.activity_id
                }
            }
        );

        longTermInstances.forEach(e => {
            console.log("date", e.date);
            activityJson.date.push(e.date);
        });

    }

    return activityJson;
};

/**
 * Add user to the application list of an activity
 * @param {*} req 
 * @param {*} res 
 * @param {*} activity_id 
 * @param {*} user_id 
 * @param {*} application_response 
 * @returns 
 */
async function needReviewApply(req, res, activity_id, user_id, application_response) {

    const applicantExist = await activityModel.Applications.findOne({
        where: {
            applicant_id: user_id,
            activity_id: activity_id
        }
    });

    if (applicantExist) return res.status(409).send("Applicant already exist.");

    // const application_response = req.body.application_response; // TODO: need to check if the paramter exists
    if (application_response !== undefined) {
        activityModel.Applications.create(
            {
                application_response: application_response,
                applicant_id: user_id,
                activity_id: activity_id,
            }
        );
    }
    return res.status(201).send("Successfully send the application");
}

/**
 * Directly include the user to the participants of the activity
 * @param {*} req 
 * @param {*} res 
 * @param {*} activity_id 
 * @param {*} user_id 
 * @returns 
 */
async function noReviewApply(req, res, activity_id, user_id) { // add participant_name
    participantsExist = await activityModel.ActivityParticipantStatus.findOne({
        where: {
            joined_activities: activity_id,
            participants: user_id,
        }
    });

    if (participantsExist) return res.status(400).send("applier has already joined");
    const user = await User.findOne({
        where: { user_id: user_id }

    });

    // update participants
    await activityModel.ActivityParticipantStatus.create(
        {
            joined_activities: activity_id,
            participants: user_id,
            participant_name: user.name
        }
    );
    return res.status(200).send("joined!");

}

/**
 * sync all the model used in the controller 
 */
exports.sync = async () => {
    await activityModel.Activities.sync({ alter: true });
    await activityModel.ActivityParticipantStatus.sync({ alter: true });
    await activityModel.LongTermActivities.sync({ alter: true });
    await activityModel.Tag.sync({ alter: true });
    await activityModel.ActivityTag.sync({ alter: true });
    await activityModel.Applications.sync({ alter: false });
    await activityModel.Invitation.sync({ alter: false });
    await activityModel.Discussion.sync({ alter: false });
};

/**
 * get all activity as a list
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.getActivitiesList = async (req, res) => {
    try {
        const user_id = req.user_id;

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        const start_date = req.query.start_date;
        const end_date = req.query.end_date;
        const search = req.query.search;
        const country = req.query.country;
        const location = req.query.location;
        const is_long_term = req.query.is_long_term || false;
        const mode = req.query.mode || "all";

        allowModes = ["owned", "joined", "all"];

        if (allowModes.includes(mode) == false) return res.status(400).send("invalid mode");

        // set search condition
        var condition = {
            is_one_time: !is_long_term,
        };

        if (country) condition.country = country;
        if (location) condition.location = location;
        if (search) condition.name = { [Op.like]: '%' + search + '%' };
        if (start_date & end_date) {
            condition.date = {
                [Op.between]: [start_date, end_date]
            };
        } else if (start_date) {
            condition.date = {
                [Op.gt]: [start_date]
            };
        } else if (end_date) {
            condition.date = {
                [Op.lt]: [end_date]
            };
        }

        // set include condition
        var includeConditions = new Array;
        if (mode == "owned") includeConditions.push({
            model: User,
            as: 'Creator'
        });
        else if (mode == "joined") includeConditions.push({
            model: User,
            as: 'Participants',
            where: {
                user_id: user_id,
            }
        });

        const activities = await activityModel.Activities.findAll({
            include: includeConditions,
            where: condition,
            limit: limit,
            offset: offset,
        });

        res.status(200).json(activities);
    } catch (error) {
        console.error('Error fetching activities:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Create activity from request data
 * @param {*} req 
 * @param {*} res 
 */
exports.createActivity = async (req, res) => {
    /*
    Exampe request format
    {
        "id": 10,
        "name": "example Activity",
        "introduction": "Introduction of Activity",
        "date": "2024-04-27T04:56:30.276Z",
        "need_review": true,
        "country": "string",
        "max_participants": 0,
        "location": "string",
        "tags": ["study"]
        "application_problem": "string",
    };
    */

    var newActivity = null;
    try {
        const user_id = req.user_id;
        const { id, ...body } = req.body;
        var dates = null;

        // get date list and make date field a single element
        body.created_user_id = user_id;

        // process long term date
        if (!body.is_one_time) {
            dates = body.date;
            body.date = dates[0];
        }

        const newActivity = await activityModel.Activities.create(body);
        const user = await User.findOne({ where: { user_id: user_id } });
        // console.log(newActivity);

        // create long term activity
        if (!body.is_one_time) {
            for (const date in dates) {
                await activityModel.LongTermActivities.create(
                    {
                        activity_id: newActivity.activity_id,
                        date: date,
                    }
                );
            }
        }

        // update participants
        await activityModel.ActivityParticipantStatus.create(
            {
                joined_activities: newActivity.activity_id,
                participants: user_id,
                participant_name: user.name
            }
        );

        // update type
        if (body.tags == null) {
            await newActivity.destroy();
            return res.status(400).json({ error: "tags are not provided" });
        }

        for (let index = 0; index < body.tags.length; index++) {
            var tag = body.tags[index];

            if (!allowTags.includes(tag)) {
                await newActivity.destroy();
                return res.status(400).json({ error: `tag ${tag} is not an allowed tag` });
            }

            var tagInstances = await activityModel.Tag.findOrCreate(
                {
                    where: {
                        name: tag,
                    }
                }
            );

            await activityModel.ActivityTag.create(
                {
                    activities: newActivity.activity_id,
                    tag: tagInstances[0].id,
                }
            );
        }

        res.status(201).json({ message: "Successfully create an Activity", activity_id: newActivity.activity_id });
    }
    catch (error) {
        if (newActivity) newActivity.destroy();
        console.error("Error creating activity", error);
        res.status(500).json({ error: error });
    }

};

/**
 * get the detail of activity given activity_id in req.params
 * @param {*} req 
 * @param {*} res 
 * }
 */
exports.getActivityDetail = async (req, res) => {

    /* NOTE: response format
    {
        "id": 10,
        "name": "example Activity",
        "introduction": "Introduction of Activity",
        "date": "2024-04-27T05:48:47.139Z",
        "created_user": {
            "id": 10,
            "username": "theUser",
            "email": "john@email.com",
            "user_photo": "https://s3.ntugether.com/photos/1.pdf"
        },
        "need_review": true,
        "county": "string",
        "location": "string",
        "max_participants": 0,
        "application_problem": "string",
        "joined_users": [
            {
                "id": 10,
                "username": "theUser",
                "email": "john@email.com",
                "user_photo": "https://s3.ntugether.com/photos/1.pdf"
            }
        ]
    };
    */

    try {
        const user_id = req.user_id;

        const activity_id = req.params.activity_id;
        var activity = await activityModel.Activities.findByPk(activity_id);
        if (activity == null) return res.status(404).send("Activity not found");
        activity = await returnActivity(activity_id, activity.is_one_time);
        return res.status(200).json(activity);
    } catch (error) {
        console.error("Error getting activity detail", error);
        return res.status(500).json({ error: "Internal server error" });
    }

};

/**
 * Update an existing activity by Id. Only the creator of the activity could call this endpoint.
 * The activity_id should be defined in the url parameter
 * @param {*} req 
 * @param {*} res 
 */
exports.updateActivity = async (req, res) => {
    /* NOTE: request format
    {
        "id": 10,
        "name": "example Activity",
        "introduction": "Introduction of Activity",
        "date": "2024-04-27T06:26:48.578Z",
        "need_review": true,
        "county": "string",
        "max_participants": 0,
        "location": "string",
        "application_problem": "string"
    }
    */

    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;

        // Find the activity by ID
        var activity = await activityModel.Activities.findByPk(activity_id);

        // If activity not found, return 404 error
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        // check if the user is the creator of the activity
        // NOTE: move to middleware?
        if (activity.created_user_id != user_id) {
            return res.status(403).json({ error: 'You are not authorized to update this activity' });
        }

        const { ...updateParams } = req.body; // NOTE: might use ...updateParams to separate update data and others
        await activity.update(updateParams);
        var updatedActivity = await returnActivity(activity_id, this.updateActivity.is_one_time);
        res.status(200).json(updatedActivity);
    } catch (error) {
        // If any error occurs, handle it and send a 500 error response
        console.error('Error updating activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }

};

/**
 * Delete the activity. Only the creator of the activity could call this endpoint
 * @param {*} req 
 * @param {*} res 
 */
exports.deleteActivity = async (req, res) => {

    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;
        console.log(activity_id);

        // Find the activity by ID
        var activity = await activityModel.Activities.findByPk(activity_id);

        // If activity not found, return 404 error
        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        // check if the user is the creator of the activity
        // NOTE: move to middleware?
        if (activity.created_user_id != user_id) {
            return res.status(403).json({ error: 'You are not authorized to delete this activity' });
        }
        await activity.destroy();

        res.status(204).send("sucessfully delete");
    } catch (error) {
        // If any error occurs, handle it and send a 500 error response
        console.error('Error deleting activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Get all application for the specific activity. Only the creator of the activity could call this endpoint.
 * @param {*} req 
 * @param {*} res 
 */
exports.getAllApplications = async (req, res) => {

    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;
        const activity = await activityModel.Activities.findByPk(activity_id);

        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }
        if (activity.created_user_id != user_id) {
            return res.status(403).json({ error: 'not activity creator' });
        }

        const applications = await activityModel.Applications.findAll({
            where: {
                activity_id: activity_id
            }
        });

        res.json(applications);
    } catch (error) {
        // If any error occurs, handle it and send a 500 error response
        console.error('Error getting all applications:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.getAllParticipants = async (req, res) => {

    try {
        // const user_id = req.user_id;

        const activity_id = req.params.activity_id;
        var activity = await activityModel.Activities.findByPk(activity_id);
        if (activity == null) return res.status(404).send("Activity not found.");

        const participants = await activityModel.ActivityParticipantStatus.findAll({
            where: {
                joined_activities: activity_id
            },

        });
        return res.status(200).json(participants);

    } catch (error) {
        console.error("Error getting participants list.", error);
        res.status(500).json({ error: "Internal server error" });
    }

};

/**
 * remove the join user for specific activity, only activity creator can do this
 * @param {*} req 
 * @param {*} res 
 */
exports.removeUser = async (req, res) => {
    /* NOTE: request body
    {
        "user_id": [0]
    }
    */

    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;
        const activity = await activityModel.Activities.findByPk(activity_id);

        if (!activity) return res.status(404).send("Activity not found");
        if (activity.created_user_id != user_id) return res.status(403).send("authorization failed");

        // const remove_user_ids = req.body.user_id; // array
        const remove_id = req.body.remove_user_id;
        // for (const remove_id of remove_user_ids) {

        participant = await activityModel.ActivityParticipantStatus.findOne(
            {
                where: {
                    joined_activities: activity_id,
                    participants: remove_id
                }
            }
        );
        if (participant) {
            participant.destroy();
            res.status(204).send("user removed");
        } else {
            res.status(404).send("Participants not found.");
        }
        // }

        // res.status(200).send("users removed");

    } catch (error) {
        console.error('Error removing participants:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * join specific activity, except the user has joined it already
 * @param {*} req 
 * @param {*} res 
 */
exports.applyActivity = async (req, res) => {
    /* NOTE: request body
    {
        "application_response": "string"
    }
    */
    const { application_response } = req.body;
    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;

        const activity = await activityModel.Activities.findByPk(activity_id);

        if (!activity) return res.status(404).send("Activity not found");
        if (activity.created_user_id === user_id) return res.status(403).send("Activity creator should not applied.");

        const activityNeedReview = await activityModel.Activities.findOne({
            where: {
                need_reviewed: true,
                activity_id: activity_id
            }
        });

        console.log("need review", activityNeedReview);
        if (activityNeedReview) return needReviewApply(req, res, activity_id, user_id, application_response);

        return noReviewApply(req, res, activity_id, user_id); //add , participant_name
    } catch (error) {
        console.error('Error applying for activity:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.joinActivity = async (req, res) => {

};

exports.leaveActivity = async (req, res) => { }; // NOTE: not specified yet

/**
 * get all discussion based on the order of timeline of specific activity, where the output is also controlled by offset and limit
 * @param {*} req 
 * @param {*} res 
 */
exports.getDiscussion = async (req, res) => {
    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;
        const limit = parseInt(req.query.limit);
        const offset = parseInt(req.query.offset);

        // validation
        const activity = await activityModel.Activities.findByPk(activity_id);
        if (!activity) return res.status(404).send("Activity not found");

        const discussions = await activityModel.Discussion.findAll({
            include: [
                {
                    model: User,
                    as: "Sender",
                },
                {
                    model: activityModel.Activities,
                    as: "Activity",
                    where: {
                        activity_id: activity_id,
                    }
                },
            ],
            limit: limit,
            offset: offset,
        });

        return res.status(200).json(discussions);
    } catch (error) {
        console.error('Error getting discussion:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 */
exports.makeDiscussion = async (req, res) => {
    /* NOTE: request body
    {
        "content": "string"
    }
    */

    try {
        const user_id = req.user_id;
        const activity_id = req.params.activity_id;
        const content = req.body.content;

        // validation
        const activity = await activityModel.Activities.findByPk(activity_id);
        if (!activity) {
            return res.status(404).send("Activity not found");
        }


        var isParicipant = await activityModel.ActivityParticipantStatus.findOne({
            where: {
                joined_activities: activity_id,
                participants: user_id
            }
        });

        if (!isParicipant) {   // 只要是參加者都可以留言
            return res.status(403).send("User hasn't joined the activity");
        }

        const discussion = activityModel.Discussion.create(
            {
                sender_id: user_id,
                activity_id: activity_id,
                content: content,
            }
        );

        return res.status(201).send("discussion made");

    } catch (error) {
        console.error('Error making discussion:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};